<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Slider;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Sliders (§8.5) + General Info (§8.6): public reads active content; SEAL/UNO manage.
 */
class PublicContentTest extends TestCase
{
    use RefreshDatabase;

    private const GOLACHIPA = 'http://golachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function uno(): User
    {
        return User::where('username', 'uno_golachipa')->firstOrFail();
    }

    public function test_public_sliders_returns_only_active(): void
    {
        // Seeder: 3 active + 1 stopped.
        $this->getJson(self::GOLACHIPA.'/api/sliders')
            ->assertOk()->assertJsonCount(3, 'sliders');
    }

    public function test_public_general_info_is_grouped(): void
    {
        $res = $this->getJson(self::GOLACHIPA.'/api/general-info')->assertOk();
        $this->assertCount(4, $res->json('phones'));
        $this->assertCount(1, $res->json('about'));
    }

    public function test_uno_creates_a_slider_with_image(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->uno());

        $this->post(self::GOLACHIPA.'/api/manage/sliders', [
            'title' => 'নতুন সচেতনতা',
            'image' => UploadedFile::fake()->image('slide.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.title', 'নতুন সচেতনতা');

        $this->assertDatabaseHas('sliders', ['title' => 'নতুন সচেতনতা', 'tenant_id' => 'golachipa']);
    }

    public function test_uno_toggles_and_deletes_a_slider(): void
    {
        $slider = Upazila::find('golachipa')->run(fn () => Slider::factory()->create());
        Sanctum::actingAs($this->uno());

        $this->post(self::GOLACHIPA."/api/manage/sliders/{$slider->id}", ['is_active' => false], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->deleteJson(self::GOLACHIPA."/api/manage/sliders/{$slider->id}")->assertOk();
        $this->assertDatabaseMissing('sliders', ['id' => $slider->id]);
    }

    public function test_uno_manages_general_info(): void
    {
        Sanctum::actingAs($this->uno());
        $this->postJson(self::GOLACHIPA.'/api/manage/general-info', [
            'type' => 'phone', 'title' => 'বিদ্যুৎ অফিস', 'value' => '01611112222',
        ])->assertCreated();

        $this->assertDatabaseHas('general_infos', ['title' => 'বিদ্যুৎ অফিস', 'tenant_id' => 'golachipa']);
    }

    public function test_citizen_cannot_manage(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->getJson(self::GOLACHIPA.'/api/manage/sliders')->assertStatus(403);
    }
}
