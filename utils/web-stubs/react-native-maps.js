// Web stand-in for react-native-maps (see metro.config.js). The map screen shows a notice on web;
// the rest of the app renders normally. Native builds never load this file.
const React = require("react");
const { Text, View } = require("react-native");

const MapView = React.forwardRef(function MapView(props, ref) {
  return React.createElement(
    View,
    { ref, style: [{ alignItems: "center", justifyContent: "center", backgroundColor: "#e5e7eb" }, props.style] },
    React.createElement(Text, null, "Peta hanya tersedia di aplikasi iOS/Android."),
  );
});
const Nothing = () => null;

module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker: Nothing,
  Polygon: Nothing,
  Polyline: Nothing,
  Circle: Nothing,
  Callout: Nothing,
  PROVIDER_GOOGLE: "google",
  PROVIDER_DEFAULT: null,
};
