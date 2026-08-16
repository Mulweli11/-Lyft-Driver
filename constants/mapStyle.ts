const customMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#E7EDF4" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#F9FBFD" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1B2C4D" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#D7E9F7" }],
  },
];

export default customMapStyle;