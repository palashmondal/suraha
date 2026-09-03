<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\GeneralInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * সাধারণ তথ্য (§8.6): important phone numbers + about-upazila content. Public reads; SEAL/UNO manage.
 */
class GeneralInfoController extends Controller
{

    /** Grouped info for the public site (phones + about). */
    public function publicIndex(): JsonResponse
    {
        $this->requireTenant();
        $all = GeneralInfo::orderBy('sort_order')->orderBy('id')->get();

        return response()->json([
            'phones' => $this->map($all->where('type', 'phone')),
            'about' => $this->map($all->where('type', 'about')),
        ]);
    }

    public function index(): JsonResponse
    {
        return $this->publicIndex();
    }

    public function store(Request $request): JsonResponse
    {
        $this->requireTenant();
        $item = GeneralInfo::create($this->validated($request));

        return response()->json(['item' => $this->one($item)], 201);
    }

    public function update(Request $request, GeneralInfo $generalInfo): JsonResponse
    {
        $generalInfo->update($this->validated($request, false));

        return response()->json(['item' => $this->one($generalInfo)]);
    }

    public function destroy(GeneralInfo $generalInfo): JsonResponse
    {
        $generalInfo->delete();

        return response()->json(['message' => 'মুছে ফেলা হয়েছে।']);
    }

    private function validated(Request $request, bool $creating = true): array
    {
        return $request->validate([
            'type' => [$creating ? 'required' : 'sometimes', Rule::in(['phone', 'about'])],
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:180'],
            'value' => [$creating ? 'required' : 'sometimes', 'string', 'max:5000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function map($collection): array
    {
        return $collection->map(fn (GeneralInfo $g) => $this->one($g))->values()->all();
    }

    private function one(GeneralInfo $g): array
    {
        return ['id' => $g->id, 'type' => $g->type, 'title' => $g->title, 'value' => $g->value];
    }
}
