<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\SliderResource;
use App\Models\Slider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * ইমেজ স্লাইডার (§8.5). Public reads the active carousel; SEAL/UNO manage.
 */
class SliderController extends Controller
{

    /** Active slides for the landing page + dashboard (public). */
    public function publicIndex(): JsonResponse
    {
        // Central host (suraha.net) has no upazila, so no sliders — return empty, don't 400.
        if (! tenancy()->initialized) {
            return response()->json(['sliders' => []]);
        }

        return response()->json([
            'sliders' => SliderResource::collection(
                Slider::where('is_active', true)->orderBy('sort_order')->latest()->get(),
            ),
        ]);
    }

    /** All slides (manage). */
    public function index(): JsonResponse
    {
        $this->requireTenant();

        return response()->json([
            'sliders' => SliderResource::collection(Slider::orderBy('sort_order')->latest()->get()),
        ]);
    }

    public function store(Request $request): SliderResource
    {
        $this->requireTenant();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'link' => ['nullable', 'url', 'max:255'],
            'slide_date' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('sliders/'.tenant()->getTenantKey(), 'public');
        }
        unset($data['image']);

        return new SliderResource(Slider::create($data));
    }

    public function update(Request $request, Slider $slider): SliderResource
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'link' => ['nullable', 'url', 'max:255'],
            'slide_date' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('sliders/'.tenant()->getTenantKey(), 'public');
        }
        unset($data['image']);

        $slider->update($data);

        return new SliderResource($slider);
    }

    public function destroy(Slider $slider): JsonResponse
    {
        if ($slider->image_path) {
            Storage::disk('public')->delete($slider->image_path);
        }
        $slider->delete();

        return response()->json(['message' => 'মুছে ফেলা হয়েছে।']);
    }
}
