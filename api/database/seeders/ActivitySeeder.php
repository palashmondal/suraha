<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Assistance;
use App\Models\BirthRegistration;
use App\Enums\ComplaintStatus;
use App\Models\Complaint;
use App\Models\Suggestion;
use App\Models\Pregnancy;
use App\Models\Union;
use App\Models\Upazila;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * Six months of demo activity, so the dashboard's মাসিক কার্যক্রম chart shows a working office
 * rather than one that started yesterday.
 *
 * The other module seeders create their records with today's timestamp, which left every series
 * flat until the current month and then spiking. This one backdates records across the window the
 * chart actually reads (ReportController counts created_at over the last six months) and nudges
 * the volume up month by month, so the lines climb instead of jumping.
 *
 * Each record's own dates are moved with it: a complaint filed in April is dated April, not today.
 */
class ActivitySeeder extends Seeder
{
    /** Records per module per month, oldest first — a gently busier office each month. */
    private const VOLUME = [
        'pregnancy' => [5, 7, 8, 11, 13, 15],
        'birth' => [3, 4, 6, 7, 9, 10],
        'complaint' => [3, 5, 4, 7, 8, 9],
        'appointment' => [4, 6, 7, 8, 11, 12],
        'assistance' => [3, 4, 6, 6, 8, 9],
        'suggestion' => [2, 4, 4, 5, 7, 8],
    ];

    public function run(): void
    {
        $months = 6;

        foreach (Upazila::all() as $upazila) {
            $upazila->run(function () use ($upazila, $months) {
                $unionIds = Union::where('tenant_id', $upazila->getTenantKey())->pluck('id');
                $author = User::where('tenant_id', $upazila->getTenantKey())->value('id');

                if ($unionIds->isEmpty()) {
                    return;   // nothing to file records against
                }

                // Before adding anything: this only recognises leftovers by their today stamp, so
                // it has to run while today's records are the module seeders' and not also ours.
                $this->scatterLeftovers($months);

                for ($back = $months - 1; $back >= 0; $back--) {
                    $i = $months - 1 - $back;
                    $month = CarbonImmutable::today()->subMonths($back);

                    $this->make(Pregnancy::class, self::VOLUME['pregnancy'][$i], $month, $unionIds, $author);
                    $this->make(BirthRegistration::class, self::VOLUME['birth'][$i], $month, $unionIds, $author);
                    $this->make(Complaint::class, self::VOLUME['complaint'][$i], $month, $unionIds, $author);
                    $this->make(Appointment::class, self::VOLUME['appointment'][$i], $month, $unionIds, $author);
                    $this->make(Assistance::class, self::VOLUME['assistance'][$i], $month, $unionIds, $author);
                    $this->make(Suggestion::class, self::VOLUME['suggestion'][$i], $month, $unionIds, $author);
                }
            });
        }
    }

    /**
     * The module seeders stamp their records with today, which piles a month's worth of history
     * onto the current column and reproduces the spike this seeder exists to remove. Scatter them
     * back across the window, keeping a few recent so the dashboard's "today" counters are not
     * empty.
     */
    private function scatterLeftovers(int $months): void
    {
        foreach ([Pregnancy::class, BirthRegistration::class, Complaint::class, Appointment::class, Assistance::class, Suggestion::class] as $model) {
            $today = $model::whereDate('created_at', CarbonImmutable::today())->get();

            foreach ($today->skip(2) as $record) {
                $at = $this->momentIn(CarbonImmutable::today()->subMonths(random_int(1, $months - 1)));
                $record->forceFill($this->datesFor($model, $at))->saveQuietly();
            }
        }
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function make(string $model, int $count, CarbonImmutable $month, $unionIds, ?int $author): void
    {
        for ($n = 0; $n < $count; $n++) {
            $at = $this->momentIn($month);

            $record = $this->factoryFor($model, $at)->create([
                'union_id' => $unionIds->random(),
            ] + ($author ? ['created_by' => $author] : []));

            // Factories stamp today; move the record and its own dates back to the month it
            // belongs to, or the chart would still show everything landing at once.
            $record->forceFill($this->datesFor($model, $at))->saveQuietly();

            // Every অভিযোগ was filed at some moment — without the event its detail page shows an
            // empty কার্যক্রম, which is what the seeded rows looked like before.
            if ($model === Complaint::class) {
                $this->seedComplaintTimeline($record, $at);
            }
        }
    }

    /**
     * Older work is mostly finished, recent work mostly still open — which is what makes the
     * delivery, resolution and approval rates read like a working office instead of an office
     * that never closes anything. Records seeded with the default state alone drove every rate
     * to single digits.
     *
     * @param  class-string<Model>  $model
     */
    private function factoryFor(string $model, CarbonImmutable $at)
    {
        $factory = $model::factory();
        // 0 for this month, rising to 1 for the oldest — the chance the record is done with.
        $age = min(5, CarbonImmutable::today()->diffInMonths($at, absolute: true)) / 5;
        $settled = random_int(0, 100) / 100 < (0.15 + 0.7 * $age);

        if (! $settled) {
            return $factory;
        }

        return match ($model) {
            Pregnancy::class => $factory->delivered(),
            BirthRegistration::class => $factory->entered(),
            Appointment::class => random_int(1, 10) > 2 ? $factory->approved() : $factory->rejected(),
            Assistance::class => random_int(1, 10) > 3 ? $factory->approved() : $factory->rejected(),
            Suggestion::class => random_int(1, 10) > 3 ? $factory->accepted() : $factory->rejected(),
            Complaint::class => random_int(1, 10) > 3 ? $factory->completed() : $factory->assigned(),
            default => $factory,
        };
    }

    /** The lifecycle steps a seeded complaint has already been through, dated with the record. */
    private function seedComplaintTimeline(Complaint $c, CarbonImmutable $at): void
    {
        $step = function (string $type, array $meta = []) use ($c, $at) {
            $c->events()->create(['type' => $type, 'actor_role' => 'uno', 'meta' => $meta])
                ->forceFill(['created_at' => $at, 'updated_at' => $at])->saveQuietly();
        };

        $step('filed');

        if ($c->status === ComplaintStatus::PENDING) {
            return;
        }

        $officer = $c->investigatingOfficer;
        $step('accepted', [
            'officer_id' => $officer?->id,
            'officer_name' => $officer?->name,
            'officer_designation' => $officer?->designation,
            'due_date' => $c->due_date?->toDateString(),
        ]);

        if ($c->status === ComplaintStatus::COMPLETED) {
            $step('report');
            $step('completed');
        }
    }

    /** A plausible working moment inside the month — never in the future. */
    private function momentIn(CarbonImmutable $month): CarbonImmutable
    {
        $last = min($month->endOfMonth()->day, CarbonImmutable::today()->isSameMonth($month) ? CarbonImmutable::today()->day : $month->endOfMonth()->day);

        return $month->startOfMonth()
            ->addDays(random_int(0, max(0, $last - 1)))
            ->addHours(random_int(9, 16))
            ->addMinutes(random_int(0, 59));
    }

    /** @return array<string, mixed> */
    private function datesFor(string $model, CarbonImmutable $at): array
    {
        $dates = ['created_at' => $at, 'updated_at' => $at];

        return match ($model) {
            Complaint::class => $dates + ['complaint_date' => $at->toDateString()],
            Appointment::class => $dates + ['appointment_date' => $at->addDays(random_int(1, 10))->toDateString()],
            default => $dates,
        };
    }
}
