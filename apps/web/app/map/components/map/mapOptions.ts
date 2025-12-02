export const mapOptions: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  cameraControl: false,
  fullscreenControl: false,
  zoomControl: false,
  backgroundColor: "#000000",
  styles: [
    { elementType: "geometry", stylers: [{ color: "#000000" }] },
    
    { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },

    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d4d4d8" }],
    },

    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },

    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#18181b" }], // Zinc-900
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#3f3f46" }],
    },

    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#18181b" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#000000" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#52525b" }],
    },

    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#27272a" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#000000" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#a1a1aa" }],
    },

    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#09090b" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#3f3f46" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#000000" }],
    },
  ],
};
