import React from 'react';
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from '@geoapify/react-geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

export interface LocationData {
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  formatted_address: string;
}

interface Props {
  value: string;
  onSelect: (data: LocationData) => void;
  placeholder?: string;
}

/**
 * City-level location autocomplete using Geoapify.
 * Returns lat/lon so the backend no longer needs to geocode.
 */
const LocationAutocomplete: React.FC<Props> = ({ value, onSelect, placeholder }) => {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY as string;

  function handleSelect(place: any) {
    if (!place) return;
    const { lat, lon, city, country, formatted } = place.properties;
    if (lat == null || lon == null) return;
    onSelect({
      city: city || null,
      country: country || null,
      latitude: lat,
      longitude: lon,
      formatted_address: formatted || `${city}, ${country}`,
    });
  }

  return (
    <GeoapifyContext apiKey={apiKey}>
      <GeoapifyGeocoderAutocomplete
        placeholder={placeholder}
        value={value}
        type="city"
        placeSelect={handleSelect}
        debounceDelay={200}
      />
    </GeoapifyContext>
  );
};

export default LocationAutocomplete; 