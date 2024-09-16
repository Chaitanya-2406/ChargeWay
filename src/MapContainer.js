import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import './MapContainer.css';

const containerStyle = {
  width: '60%',
  height: '500px',
  margin: '0 auto',
};

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });
  const [selectedStation, setSelectedStation] = useState(null);
  const [distances, setDistances] = useState([]);
  const [directionsResponse, setDirectionsResponse] = useState(null);

  const onLoad = useCallback(function callback(map) {
    const bounds = new window.google.maps.LatLngBounds();
    map.fitBounds(bounds);
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  // Function to get current location
  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          map?.panTo({ lat: latitude, lng: longitude });
        },
        () => {
          console.error('Error fetching location');
        }
      );
    } else {
      console.error('Geolocation not supported by this browser');
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, [map]);

  // Function to fetch nearby electric vehicle charging stations
  const fetchNearbyStations = () => {
    if (!map) {
      console.error('Map is not loaded yet');
      return;
    }

    const request = {
      location: currentLocation,
      radius: '5000',
      type: ['electric_vehicle_charging_station'],
    };

    const service = new window.google.maps.places.PlacesService(map);
    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        setStations(results);
        calculateDistances(results);
      } else {
        console.error('No electric vehicle charging stations found');
        setStations([]);
      }
    });
  };

  // Function to calculate distances and find the nearest station
  const calculateDistances = (stations) => {
    const service = new window.google.maps.DistanceMatrixService();
    const destinations = stations.map((station) => station.geometry.location);

    service.getDistanceMatrix(
      {
        origins: [currentLocation],
        destinations,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === window.google.maps.DistanceMatrixStatus.OK) {
          const distances = response.rows[0].elements.map((element) => element.distance.value);
          setDistances(distances);
        }
      }
    );
  };

  // Function to get directions to a specific station
  const getDirections = (destination) => {
    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: currentLocation,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
        } else {
          console.error('Error fetching directions');
        }
      }
    );
  };

  // Function to clear current directions
  const clearDirections = () => {
    setDirectionsResponse(null);
  };

  // Handle station click: update directions dynamically
  const handleStationClick = (station, index) => {
    setSelectedStation(station);
    clearDirections();
    getDirections(station.geometry.location);
  };

  return (
    <LoadScript googleMapsApiKey="AIzaSyDMeIxByl8noZVfqNWTtI5xN-1mG4PLHDw" libraries={['places']}>
      <div className="map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={currentLocation}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {/* Marker for current location */}
          {currentLocation.lat !== 0 && (
            <Marker
              position={currentLocation}
              title="You are here"
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }}
            />
          )}

          {/* Markers for nearby electric vehicle charging stations */}
          {stations.map((station, index) => (
            <Marker
              key={station.place_id}
              position={{
                lat: station.geometry.location.lat(),
                lng: station.geometry.location.lng(),
              }}
              title={station.name}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              }}
              onClick={() => handleStationClick(station, index)}
            />
          ))}

          {/* InfoWindow to show station details */}
          {selectedStation && (
            <InfoWindow
              position={{
                lat: selectedStation.geometry.location.lat(),
                lng: selectedStation.geometry.location.lng(),
              }}
              onCloseClick={() => setSelectedStation(null)}
            >
              <div>
                <h3>{selectedStation.name}</h3>
                <p>Distance: {(distances[stations.indexOf(selectedStation)] / 1000).toFixed(2)} km</p>
                <p>{selectedStation.vicinity}</p>
              </div>
            </InfoWindow>
          )}

          {/* Directions to the selected station */}
          {directionsResponse && <DirectionsRenderer directions={directionsResponse} />}
        </GoogleMap>

        <div className="button-container">
          <button onClick={fetchNearbyStations}>Find Nearby Electric Charging Stations</button>
          <button onClick={fetchCurrentLocation}>Fetch My Current Location</button>
        </div>
      </div>
    </LoadScript>
  );
};

export default MapContainer;
