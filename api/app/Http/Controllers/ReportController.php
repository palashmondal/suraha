<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\BirthRegistration;
use App\Models\Complaint;
use App\Models\Pregnancy;
use App\Models\Union;
use App\Models\Upazila;
use App\Models\User;
use App\Support\ScopeResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reporting & analytics (§8.7). Returns one filter-aware, scope-aware bundle that drives the
 * charts: KPIs, monthly trends, status breakdowns, performance rates, the complaint funnel, and a
 * comparison block (union-wise for a single upazila, upazila-wise for a DC/SEAL aggregate).
 */
class ReportController extends Controller
{
    private const BN_MONTHS = ['জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'];

    private array $ids = [];
    private ?string $from = null;
    private ?string $to = null;
    private ?string $unionId = null;
    private ?string $wardNo = null;

    public function index(Request $request): JsonResponse
    {
        [$ids, $scope] = ScopeResolver::resolve($request->user());
        $this->ids = $ids;
        $this->from = $request->query('from');
        $this->to = $request->query('to');
        $this->unionId = $request->query('union_id');
        $this->wardNo = $request->query('ward_no');

        $isAggregate = $scope['level'] !== 'tenant';

        return response()->json([
            'scope' => $scope,
            'filters' => ['from' => $this->from, 'to' => $this->to, 'union_id' => $this->unionId, 'ward_no' => $this->wardNo],
            'kpis' => $this->kpis(),
            'trends' => $this->trends(),
            'status' => $this->statusBreakdown(),
            'rates' => $this->rates(),
            'funnel' => $this->funnel(),
            'by_union' => $isAggregate ? null : $this->byUnion(),
            'by_upazila' => $isAggregate ? $this->byUpazila() : null,
        ]);
    }

    // ---- scoped base queries --------------------------------------------

    /** Scope + union/ward filters (no date). */
    private function base(string $model): Builder
    {
        return $model::query()->withoutTenancy()->whereIn('tenant_id', $this->ids)
            ->when($this->unionId, fn ($q) => $q->where('union_id', $this->unionId))
            ->when($this->wardNo, fn ($q) => $q->where('ward_no', $this->wardNo));
    }

    /** base() + the date range (applied to the KPI/status/funnel/comparison sections). */
    private function dated(string $model): Builder
    {
        return $this->base($model)
            ->when($this->from, fn ($q) => $q->whereDate('created_at', '>=', $this->from))
            ->when($this->to, fn ($q) => $q->whereDate('created_at', '<=', $this->to));
    }

    private static function rate(int $part, int $total): float
    {
        return $total > 0 ? round($part / $total * 100, 1) : 0.0;
    }

    // ---- sections -------------------------------------------------------

    private function kpis(): array
    {
        $pregTotal = $this->dated(Pregnancy::class)->count();
        $delivered = $this->dated(Pregnancy::class)->where('delivery_status', 'delivered')->count();
        $compTotal = $this->dated(Complaint::class)->count();
        $resolved = $this->dated(Complaint::class)->where('status', 'completed')->count();
        $apptTotal = $this->dated(Appointment::class)->count();
        $approved = $this->dated(Appointment::class)->where('status', 'approved')->count();

        return [
            'pregnancies_total' => $pregTotal,
            'delivery_rate' => self::rate($delivered, $pregTotal),
            'births_issued' => $this->dated(BirthRegistration::class)->where('status', 'entered')->count(),
            'births_pending' => $this->dated(BirthRegistration::class)->where('status', 'pending_entry')->count(),
            'complaints_total' => $compTotal,
            'resolution_rate' => self::rate($resolved, $compTotal),
            'avg_resolution_days' => $this->avgResolutionDays(),
            'appointments_total' => $apptTotal,
            'approval_rate' => self::rate($approved, $apptTotal),
            'officers' => User::whereIn('tenant_id', $this->ids)->where('role', '!=', 'citizen')->count(),
        ];
    }

    private function avgResolutionDays(): float
    {
        $rows = $this->dated(Complaint::class)->whereNotNull('completed_at')->get(['created_at', 'completed_at']);
        if ($rows->isEmpty()) {
            return 0.0;
        }

        return round($rows->avg(fn (Complaint $c) => $c->created_at->diffInHours($c->completed_at) / 24), 1);
    }

    /** Last 6 months of new records per module (uses scope + union/ward, ignores the date range). */
    private function trends(): array
    {
        return collect(range(5, 0))->map(function (int $back) {
            $m = now()->subMonths($back);
            $count = fn (string $model) => $this->base($model)
                ->whereYear('created_at', $m->year)->whereMonth('created_at', $m->month)->count();

            return [
                'month' => self::BN_MONTHS[$m->month - 1],
                'pregnancies' => $count(Pregnancy::class),
                'births' => $count(BirthRegistration::class),
                'complaints' => $count(Complaint::class),
                'appointments' => $count(Appointment::class),
            ];
        })->all();
    }

    private function statusBreakdown(): array
    {
        $countBy = fn (string $model, string $col, string $val) => $this->dated($model)->where($col, $val)->count();

        return [
            'pregnancy' => [
                ['name' => 'ডেলিভারি হয়েছে', 'value' => $countBy(Pregnancy::class, 'delivery_status', 'delivered'), 'tone' => 'success'],
                ['name' => 'ডেলিভারী হয়নি', 'value' => $countBy(Pregnancy::class, 'delivery_status', 'not_delivered'), 'tone' => 'danger'],
            ],
            'birth' => [
                ['name' => 'জন্মনিবন্ধন সম্পন্ন', 'value' => $countBy(BirthRegistration::class, 'status', 'entered'), 'tone' => 'success'],
                ['name' => 'জন্মনিবন্ধন সম্পন্ন হয়নি', 'value' => $countBy(BirthRegistration::class, 'status', 'pending_entry'), 'tone' => 'pending'],
            ],
            'complaint' => [
                ['name' => 'অপেক্ষমাণ', 'value' => $countBy(Complaint::class, 'status', 'pending'), 'tone' => 'pending'],
                ['name' => 'তদন্ত কর্মকর্তা নিযুক্ত', 'value' => $countBy(Complaint::class, 'status', 'assigned'), 'tone' => 'info'],
                ['name' => 'সম্পন্ন', 'value' => $countBy(Complaint::class, 'status', 'completed'), 'tone' => 'success'],
                ['name' => 'বাতিল', 'value' => $countBy(Complaint::class, 'status', 'rejected'), 'tone' => 'danger'],
            ],
            'appointment' => [
                ['name' => 'অপেক্ষমান', 'value' => $countBy(Appointment::class, 'status', 'pending'), 'tone' => 'pending'],
                ['name' => 'অনুমোদিত', 'value' => $countBy(Appointment::class, 'status', 'approved'), 'tone' => 'success'],
                ['name' => 'নাকচ', 'value' => $countBy(Appointment::class, 'status', 'rejected'), 'tone' => 'danger'],
            ],
        ];
    }

    private function rates(): array
    {
        $k = $this->kpis();

        return [
            ['name' => 'ডেলিভারি হার', 'value' => $k['delivery_rate']],
            ['name' => 'নিষ্পত্তি হার', 'value' => $k['resolution_rate']],
            ['name' => 'অনুমোদন হার', 'value' => $k['approval_rate']],
        ];
    }

    /** Complaint lifecycle funnel — cumulative reach of each stage. */
    private function funnel(): array
    {
        return [
            ['stage' => 'দাখিল', 'count' => $this->dated(Complaint::class)->count()],
            ['stage' => 'তদন্ত কর্মকর্তা নিযুক্ত', 'count' => $this->dated(Complaint::class)->whereNotNull('assigned_at')->count()],
            ['stage' => 'সম্পন্ন', 'count' => $this->dated(Complaint::class)->whereNotNull('completed_at')->count()],
        ];
    }

    private function byUnion(): array
    {
        return Union::whereIn('tenant_id', $this->ids)->orderBy('name_bn')->get()->map(fn (Union $u) => [
            'name' => $u->name_bn,
            'pregnancies' => $this->dated(Pregnancy::class)->where('union_id', $u->id)->count(),
            'complaints' => $this->dated(Complaint::class)->where('union_id', $u->id)->count(),
            'appointments' => $this->dated(Appointment::class)->where('union_id', $u->id)->count(),
        ])->all();
    }

    private function byUpazila(): array
    {
        return Upazila::whereIn('id', $this->ids)->orderBy('name_bn')->get()->map(fn (Upazila $u) => [
            'name' => $u->name_bn,
            'pregnancies' => $this->dated(Pregnancy::class)->where('tenant_id', $u->id)->count(),
            'deliveries' => $this->dated(Pregnancy::class)->where('tenant_id', $u->id)->where('delivery_status', 'delivered')->count(),
            'births' => $this->dated(BirthRegistration::class)->where('tenant_id', $u->id)->where('status', 'entered')->count(),
            'complaints_resolved' => $this->dated(Complaint::class)->where('tenant_id', $u->id)->where('status', 'completed')->count(),
            'appointments_approved' => $this->dated(Appointment::class)->where('tenant_id', $u->id)->where('status', 'approved')->count(),
        ])->all();
    }
}
