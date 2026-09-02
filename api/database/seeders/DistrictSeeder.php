<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\District;
use App\Models\Division;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * All 64 districts of Bangladesh (English + Bangla), used by the instance/subdomain admin's
 * district dropdown. Bangla spellings follow the national portal (see UpazilaRefSeeder). Idempotent: firstOrCreate keyed on the English name, so it can be run on a
 * live DB without duplicating districts already created by seeds or SEAL provisioning.
 */
class DistrictSeeder extends Seeder
{
    /** [English, Bangla, division (English)] for every district. */
    public const DISTRICTS = [
        ['Bagerhat', 'বাগেরহাট', 'Khulna'],
        ['Bandarban', 'বান্দরবান', 'Chattogram'],
        ['Barguna', 'বরগুনা', 'Barishal'],
        ['Barishal', 'বরিশাল', 'Barishal'],
        ['Bhola', 'ভোলা', 'Barishal'],
        ['Bogura', 'বগুড়া', 'Rajshahi'],
        ['Brahmanbaria', 'ব্রাহ্মণবাড়িয়া', 'Chattogram'],
        ['Chandpur', 'চাঁদপুর', 'Chattogram'],
        ['Chattogram', 'চট্টগ্রাম', 'Chattogram'],
        ['Chuadanga', 'চুয়াডাঙ্গা', 'Khulna'],
        ["Cox's Bazar", 'কক্সবাজার', 'Chattogram'],
        ['Cumilla', 'কুমিল্লা', 'Chattogram'],
        ['Dhaka', 'ঢাকা', 'Dhaka'],
        ['Dinajpur', 'দিনাজপুর', 'Rangpur'],
        ['Faridpur', 'ফরিদপুর', 'Dhaka'],
        ['Feni', 'ফেনী', 'Chattogram'],
        ['Gaibandha', 'গাইবান্ধা', 'Rangpur'],
        ['Gazipur', 'গাজীপুর', 'Dhaka'],
        ['Gopalganj', 'গোপালগঞ্জ', 'Dhaka'],
        ['Habiganj', 'হবিগঞ্জ', 'Sylhet'],
        ['Jamalpur', 'জামালপুর', 'Mymensingh'],
        ['Jashore', 'যশোর', 'Khulna'],
        ['Jhalokati', 'ঝালকাঠি', 'Barishal'],
        ['Jhenaidah', 'ঝিনাইদহ', 'Khulna'],
        ['Joypurhat', 'জয়পুরহাট', 'Rajshahi'],
        ['Khagrachhari', 'খাগড়াছড়ি', 'Chattogram'],
        ['Khulna', 'খুলনা', 'Khulna'],
        ['Kishoreganj', 'কিশোরগঞ্জ', 'Dhaka'],
        ['Kurigram', 'কুড়িগ্রাম', 'Rangpur'],
        ['Kushtia', 'কুষ্টিয়া', 'Khulna'],
        ['Lakshmipur', 'লক্ষ্মীপুর', 'Chattogram'],
        ['Lalmonirhat', 'লালমনিরহাট', 'Rangpur'],
        ['Madaripur', 'মাদারীপুর', 'Dhaka'],
        ['Magura', 'মাগুরা', 'Khulna'],
        ['Manikganj', 'মানিকগঞ্জ', 'Dhaka'],
        ['Meherpur', 'মেহেরপুর', 'Khulna'],
        ['Moulvibazar', 'মৌলভীবাজার', 'Sylhet'],
        ['Munshiganj', 'মুন্সীগঞ্জ', 'Dhaka'],
        ['Mymensingh', 'ময়মনসিংহ', 'Mymensingh'],
        ['Naogaon', 'নওগাঁ', 'Rajshahi'],
        ['Narail', 'নড়াইল', 'Khulna'],
        ['Narayanganj', 'নারায়ণগঞ্জ', 'Dhaka'],
        ['Narsingdi', 'নরসিংদী', 'Dhaka'],
        ['Natore', 'নাটোর', 'Rajshahi'],
        ['Chapai Nawabganj', 'চাঁপাইনবাবগঞ্জ', 'Rajshahi'],
        ['Netrokona', 'নেত্রকোণা', 'Mymensingh'],
        ['Nilphamari', 'নীলফামারী', 'Rangpur'],
        ['Noakhali', 'নোয়াখালী', 'Chattogram'],
        ['Pabna', 'পাবনা', 'Rajshahi'],
        ['Panchagarh', 'পঞ্চগড়', 'Rangpur'],
        ['Patuakhali', 'পটুয়াখালী', 'Barishal'],
        ['Pirojpur', 'পিরোজপুর', 'Barishal'],
        ['Rajbari', 'রাজবাড়ী', 'Dhaka'],
        ['Rajshahi', 'রাজশাহী', 'Rajshahi'],
        ['Rangamati', 'রাঙ্গামাটি পার্বত্য', 'Chattogram'],
        ['Rangpur', 'রংপুর', 'Rangpur'],
        ['Satkhira', 'সাতক্ষীরা', 'Khulna'],
        ['Shariatpur', 'শরীয়তপুর', 'Dhaka'],
        ['Sherpur', 'শেরপুর', 'Mymensingh'],
        ['Sirajganj', 'সিরাজগঞ্জ', 'Rajshahi'],
        ['Sunamganj', 'সুনামগঞ্জ', 'Sylhet'],
        ['Sylhet', 'সিলেট', 'Sylhet'],
        ['Tangail', 'টাঙ্গাইল', 'Dhaka'],
        ['Thakurgaon', 'ঠাকুরগাঁও', 'Rangpur'],
    ];

    public function run(): void
    {
        $divisions = Division::pluck('id', 'name');

        foreach (self::DISTRICTS as [$name, $nameBn, $division]) {
            // updateOrCreate rather than firstOrCreate so re-running backfills division_id on
            // districts that already existed before divisions were introduced.
            District::updateOrCreate(
                ['name' => $name],
                [
                    'name_bn' => $nameBn,
                    'division_id' => $divisions[$division] ?? null,
                    // The DC dashboard's subdomain label. Shares a namespace with upazila slugs,
                    // which the upazila catalogue keeps clear of these.
                    'slug' => Str::slug($name),
                ],
            );
        }
    }
}
