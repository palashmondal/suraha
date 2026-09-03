<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Assistance;
use App\Models\BirthRegistration;
use App\Models\Complaint;
use App\Models\Pregnancy;
use App\Models\Suggestion;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * One search box over what the office holds — mothers, birth registrations, complaints,
 * appointment requests, assistance applications, suggestions and staff.
 *
 * Each role searches only what it may already open: an FWA works mothers, a UP Sochib mothers and
 * birth registrations, the UNO everything. Searching wider would surface records the searcher
 * cannot read and hand them a result that 403s on click.
 *
 * Ranking is done in PHP rather than SQL because "most matches first" means counting how many
 * distinct fields a term appears in, which no portable SQL expression gives cheaply. The candidate
 * set is small — one upazila's records, capped per module — so the cost is a few hundred rows.
 */
class SearchController extends Controller
{
    /** How many suggestions the box shows. */
    private const LIMIT = 6;

    /** Per-module candidate cap before ranking, so a common term cannot pull the whole table. */
    private const PER_MODULE = 25;

    public function index(Request $request): JsonResponse
    {
        $this->requireTenant();

        $term = trim((string) $request->query('q', ''));

        // Two characters is the shortest term worth ranking; below that everything matches.
        if (mb_strlen($term) < 2) {
            return response()->json(['results' => []]);
        }

        $role = $request->user()->role->value;
        // Mirrors the route guards on each module's own listing.
        $canBirth = in_array($role, ['up_sochib', 'uno', 'seal_admin'], true);
        $canCasework = in_array($role, ['uno', 'seal_admin'], true);

        $hits = collect()
            ->concat($this->hunt(Pregnancy::query(), $term, ['mother_name_bn' => 3, 'mother_name_en' => 3, 'mobile' => 3, 'register_no' => 3, 'husband_name' => 2, 'address' => 1, 'blood_group' => 1],
                fn (Pregnancy $p) => ['label' => 'মায়ের নাম', 'name' => $p->mother_name_bn, 'mobile' => $p->mobile, 'snippet' => trim(($p->husband_name ? 'স্বামী: '.$p->husband_name.' · ' : '').($p->address ?? '')), 'link' => '/pregnancy/'.$p->id]))
            ->concat($canBirth ? $this->hunt(BirthRegistration::query(), $term, ['child_name' => 3, 'registration_no' => 3, 'mother_name' => 2, 'father_name' => 2, 'bdris_reference' => 2],
                fn (BirthRegistration $b) => ['label' => 'জন্ম নিবন্ধন', 'name' => $b->child_name, 'mobile' => null, 'snippet' => trim('মাতা: '.($b->mother_name ?? '—').' · পিতা: '.($b->father_name ?? '—')), 'link' => '/birth']) : collect())
            ->concat($canCasework ? $this->hunt(Complaint::query(), $term, ['complainant_name' => 3, 'mobile' => 3, 'tracking_token' => 3, 'title' => 1, 'description' => 1, 'address' => 1],
                fn (Complaint $c) => ['label' => 'অভিযোগ', 'name' => $c->complainant_name, 'mobile' => $c->mobile, 'snippet' => $c->title, 'link' => '/complaint/'.$c->id]) : collect())
            ->concat($canCasework ? $this->hunt(Appointment::query(), $term, ['applicant_name' => 3, 'mobile' => 3, 'tracking_token' => 3, 'purpose' => 1, 'description' => 1, 'address' => 1],
                fn (Appointment $a) => ['label' => 'সাক্ষাৎকার', 'name' => $a->applicant_name, 'mobile' => $a->mobile, 'snippet' => $a->purpose, 'link' => '/appointment/'.$a->id]) : collect())
            ->concat($canCasework ? $this->hunt(Assistance::query(), $term, ['applicant_name' => 3, 'mobile' => 3, 'nid' => 3, 'tracking_token' => 3, 'title' => 1, 'description' => 1, 'address' => 1],
                fn (Assistance $a) => ['label' => 'মানবিক সহায়তা', 'name' => $a->applicant_name, 'mobile' => $a->mobile, 'snippet' => $a->title, 'link' => '/humanitarian/'.$a->id]) : collect())
            // A confidential suggestion is searchable by its content, never by its author.
            ->concat($canCasework ? $this->hunt(Suggestion::query(), $term, ['tracking_token' => 3, 'title' => 1, 'description' => 1],
                fn (Suggestion $s) => ['label' => 'নাগরিক পরামর্শ', 'name' => $s->is_confidential ? 'গোপনীয়' : $s->applicant_name, 'mobile' => $s->is_confidential ? null : $s->mobile, 'snippet' => $s->title, 'link' => '/advice/'.$s->id]) : collect())
            ->concat($canCasework ? $this->hunt(Suggestion::query()->where('is_confidential', false), $term, ['applicant_name' => 3, 'mobile' => 3],
                fn (Suggestion $s) => ['label' => 'নাগরিক পরামর্শ', 'name' => $s->applicant_name, 'mobile' => $s->mobile, 'snippet' => $s->title, 'link' => '/advice/'.$s->id]) : collect())
            ->concat($canCasework ? $this->hunt(User::where('tenant_id', tenant()->getTenantKey())->where('role', '!=', 'citizen'), $term, ['name' => 3, 'phone' => 3, 'username' => 3, 'name_en' => 2, 'email' => 2, 'designation' => 1],
                fn (User $u) => ['label' => 'কর্মকর্তা', 'name' => $u->name, 'mobile' => $u->phone, 'snippet' => $u->designation ?? $u->role_label_bn, 'link' => '/users']) : collect());

        $results = $hits
            // One record can surface through two field groups (a suggestion by content and by
            // author); keep the better-scoring copy.
            ->groupBy(fn (array $h) => $h['link'].'|'.$h['name'])
            ->map(fn ($group) => $group->sortByDesc('score')->first())
            ->sortByDesc('score')
            ->take(self::LIMIT)
            ->values();

        return response()->json(['results' => $results]);
    }

    /**
     * Rank by how many fields contain the term, weighted by what the field means and doubled when
     * the value starts with it. Searching a name should surface the person it belongs to, not a
     * document that happens to mention them, so identity fields carry more than free text.
     *
     * @param  array<string, int>  $fields  field => weight
     * @param  callable(Model): array<string, mixed>  $shape
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function hunt(Builder $query, string $term, array $fields, callable $shape)
    {
        $like = '%'.$term.'%';

        $rows = $query
            ->where(function (Builder $w) use ($fields, $like) {
                foreach (array_keys($fields) as $f) {
                    $w->orWhere($f, 'like', $like);
                }
            })
            ->limit(self::PER_MODULE)
            ->get();

        return $rows->map(function (Model $row) use ($fields, $term, $shape) {
            $score = 0;

            foreach ($fields as $f => $weight) {
                $value = (string) ($row->{$f} ?? '');
                $at = $value === '' ? false : mb_stripos($value, $term);

                if ($at === false) {
                    continue;
                }

                $score += $at === 0 ? $weight * 2 : $weight;
            }

            return $shape($row) + ['score' => $score];
        });
    }
}
