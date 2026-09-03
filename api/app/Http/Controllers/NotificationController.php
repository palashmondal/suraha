<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * In-app notification bell (§9). Returns the notifications targeted at the current user's role
 * within their upazila, and marks them read. Tenant-scoped by the Notification global scope.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
        $role = $request->user()->role->value;

        // The bell shows the latest 20; the "সকল নোটিফিকেশন" page requests the full list (?all=1).
        $query = Notification::where('target_role', $role)->latest();
        $items = ($request->boolean('all') ? $query->limit(200) : $query->limit(20))->get();

        return response()->json([
            'unread_count' => Notification::where('target_role', $role)->whereNull('read_at')->count(),
            'notifications' => $items->map(fn (Notification $n) => [
                'id' => $n->id,
                'module' => $n->type,
                'title' => $n->title,
                'detail' => $n->detail,
                'link' => $n->link,
                'created_at' => $n->created_at?->toIso8601String(),
                'unread' => $n->read_at === null,
            ]),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        Notification::where('target_role', $request->user()->role->value)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'সব পড়া হয়েছে।']);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        // Scoped to the caller's role (and tenant via the global scope) so users can only mark
        // their own notifications read.
        Notification::where('target_role', $request->user()->role->value)
            ->where('id', $id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'পড়া হয়েছে।']);
    }
}
