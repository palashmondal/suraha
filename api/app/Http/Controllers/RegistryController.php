<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Division;
use App\Models\Union;
use App\Models\UpazilaRef;
use App\Models\Upazila;
use Illuminate\Http\Request;

/**
 * Read-only registry lookups used by public forms and the upazila switcher: the current
 * upazila's unions, and (for cross-tenant roles) the list of upazilas they may switch into.
 */
class RegistryController extends Controller
{
    /**
     * Host context for the requesting subdomain — lets the SPA render the right shell without
     * guessing district-vs-upazila from the hostname string:
     *  - central host (suraha.net)        → { kind: 'central' }
     *  - upazila host ({upazila}.suraha…)     → { kind: 'upazila', slug, name_bn }
     * (A 'district' kind is a deferred TODO — see the platform plan.)
     */
    public function hostContext()
    {
        if (! tenancy()->initialized) {
            return response()->json(['kind' => 'central', 'slug' => null, 'name_bn' => null]);
        }

        $upazila = tenant()->load('district');

        return response()->json([
            'kind' => 'upazila',
            'slug' => $upazila->getTenantKey(),
            'name_bn' => $upazila->name_bn,
            'district_bn' => $upazila->district?->name_bn,
        ]);
    }

    /** Current upazila context (resolved from subdomain), or null on a central domain. */
    public function currentUpazila()
    {
        if (! tenancy()->initialized) {
            return response()->json(['upazila' => null]);
        }

        $upazila = tenant()->load('district');

        return response()->json([
            'upazila' => [
                'id' => $upazila->id,
                'name' => $upazila->name,
                'name_bn' => $upazila->name_bn,
                'district' => $upazila->district?->name_bn,
            ],
        ]);
    }

    /** Unions/pourashavas of the current upazila (tenant-scoped). */
    public function unions()
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        return response()->json([
            'unions' => Union::orderBy('name_bn')->get(['id', 'name', 'name_bn', 'type', 'ward_count']),
        ]);
    }

    /**
     * Upazilas the authenticated user may switch into (SEAL: all; DC: own district).
     */
    public function switchableUpazilas(Request $request)
    {
        $user = $request->user();

        $query = Upazila::query()->with('district')->where('is_active', true);

        if ($user->role->scope() === 'district') {
            $query->where('district_id', $user->district_id);
        } elseif ($user->role->scope() !== 'global') {
            $query->whereKey($user->tenant_id);
        }

        return response()->json([
            'upazilas' => $query->orderBy('name_bn')->get()->map(fn (Upazila $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'name_bn' => $u->name_bn,
                'district' => $u->district?->name_bn,
            ]),
        ]);
    }

    /** All districts (registry). */
    public function districts()
    {
        return response()->json([
            'districts' => District::orderBy('name_bn')->get(['id', 'name', 'name_bn', 'division_id']),
        ]);
    }

    /**
     * The upazilas of one district, as pickable options for the instance admin. Returns the
     * subdomain slug alongside each name so the console never has to invent one: the slug is
     * assigned in the catalogue and is unique nationwide (nine upazila names recur across
     * districts, so those are qualified with the district).
     *
     * `taken` marks upazilas already provisioned, so the console can grey them out instead of
     * letting SEAL hit a uniqueness error on submit.
     */
    public function upazilaOptions(Request $request)
    {
        $data = $request->validate([
            'district_id' => ['required', 'integer', 'exists:districts,id'],
        ]);

        $taken = Upazila::pluck('id')->all();

        return response()->json([
            'upazilas' => UpazilaRef::where('district_id', $data['district_id'])
                ->orderBy('name_bn')
                ->get(['id', 'name', 'name_bn', 'slug'])
                ->map(fn (UpazilaRef $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'name_bn' => $u->name_bn,
                    'slug' => $u->slug,
                    'taken' => in_array($u->slug, $taken, true),
                ]),
        ]);
    }

    /**
     * The eight divisions (বিভাগ), for the admin's বিভাগ → জেলা → উপজেলা cascade. The full list is
     * tiny and static, so the client fetches it once and filters districts by division_id locally
     * rather than round-tripping per selection.
     */
    public function divisions()
    {
        return response()->json([
            'divisions' => Division::orderBy('name_bn')->get(['id', 'name', 'name_bn']),
        ]);
    }

    /**
     * Public directory of active upazilas for the FWA mobile app's first-run picker. The app has
     * no subdomain yet, so it calls this on the central host, then pins its API base to the chosen
     * upazila's subdomain. Returns the subdomain slug + Bangla names.
     */
    public function upazilaDirectory()
    {
        $upazilas = Upazila::query()
            ->where('is_active', true)
            ->with('district')
            ->orderBy('name_bn')
            ->get();

        return response()->json([
            'upazilas' => $upazilas->map(fn (Upazila $u) => [
                'slug' => $u->getTenantKey(),
                'name_bn' => $u->name_bn,
                'district_bn' => $u->district?->name_bn,
            ]),
        ]);
    }

    /**
     * Certificate gate for Caddy's on-demand TLS (infra/Caddyfile).
     *
     * The proxy calls this with ?domain=<hostname> BEFORE asking Let's Encrypt for a cert, and
     * issues only on a 2xx. Without this gate anyone could point a hostname at the server and
     * burn through the ACME rate limits. Answering here is what makes provisioning a new upazila
     * need zero server changes: the cert appears on that subdomain's first request.
     *
     * Not tenant-scoped on purpose — the proxy reaches this over the internal Docker network, so
     * the request Host is the app container, not the subdomain being asked about.
     */
    public function tlsAllowed(Request $request)
    {
        $domain = strtolower(trim((string) $request->query('domain')));
        $base = strtolower((string) config('tenancy.base_domain'));

        // Central host: the national public site + the SEAL console.
        if ($domain === $base || $domain === 'www.'.$base) {
            return response()->noContent();
        }

        // {upazila}.{base} — one label deep, and only for a provisioned, active upazila.
        $label = str_ends_with($domain, '.'.$base)
            ? substr($domain, 0, -strlen('.'.$base))
            : null;

        abort_unless(
            $label !== null && $label !== '' && ! str_contains($label, '.')
                && Upazila::query()
                    ->where('is_active', true)
                    ->whereHas('domains', fn ($q) => $q->where('domain', $label))
                    ->exists(),
            404,
        );

        return response()->noContent();
    }
}
