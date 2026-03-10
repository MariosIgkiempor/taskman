<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeocodeController extends Controller
{
    /**
     * @return JsonResponse<list<array{label: string, coordinates: array{lat: float, lng: float}}>>
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:2'],
        ]);

        $response = Http::get('https://api.mapbox.com/geocoding/v5/mapbox.places/'.urlencode($validated['query']).'.json', [
            'access_token' => config('services.mapbox.access_token'),
            'limit' => 5,
            'types' => 'address,poi',
        ]);

        if (! $response->successful()) {
            return response()->json([]);
        }

        $features = $response->json('features', []);

        $results = collect($features)
            ->filter(fn (array $feature) => isset($feature['place_name'], $feature['center'][0], $feature['center'][1]))
            ->map(fn (array $feature) => [
                'label' => $feature['place_name'],
                'coordinates' => [
                    'lat' => $feature['center'][1],
                    'lng' => $feature['center'][0],
                ],
            ])->values()->all();

        return response()->json($results);
    }
}
