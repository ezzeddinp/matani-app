import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { LatLng, Region } from "react-native-maps";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export type FieldMapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: LatLng[],
    options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean },
  ) => void;
};

export type GoogleWebField = {
  id: string;
  name: string;
  areaHa: number | null;
  coordinates: LatLng[];
  strokeColor: string;
  fillColor: string;
  focused: boolean;
};

type Props = {
  apiKey?: string;
  initialRegion: Region;
  mapType: "satellite" | "standard";
  drawingMode: boolean;
  activePath: LatLng[];
  previewPath: LatLng[];
  pendingPolygon: LatLng[];
  searchMarker: LatLng | null;
  userLocation: LatLng;
  savedFields: GoogleWebField[];
  onPressCoordinate: (coordinate: LatLng) => void;
  onRegionChangeComplete: (region: Region) => void;
  onMapReady: () => void;
  onPanDrag: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
};

type WebMessage =
  | { type: "ready" }
  | { type: "press"; coordinate: LatLng }
  | { type: "region"; region: Region }
  | { type: "drag" }
  | { type: "error"; message?: string };

const encodePayload = (value: unknown) =>
  encodeURIComponent(JSON.stringify(value));

const buildMapHtml = (apiKey: string, initialRegion: Region) => {
  const initialPayload = encodePayload(initialRegion);
  const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=initMataniMap`;

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no,width=device-width" />
  <style>
    html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#e8f3e8;overflow:hidden}
    .gm-style .gm-style-iw-c{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var map;
      var overlays = [];
      var initial = JSON.parse(decodeURIComponent("${initialPayload}"));
      var post = function (payload) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      };
      var clear = function () {
        overlays.forEach(function (overlay) { overlay.setMap(null); });
        overlays = [];
      };
      var path = function (coordinates) {
        return (coordinates || []).map(function (point) {
          return { lat: Number(point.latitude), lng: Number(point.longitude) };
        });
      };
      var addMarker = function (coordinate, options) {
        if (!coordinate) return;
        var marker = new google.maps.Marker(Object.assign({
          map: map,
          position: { lat: Number(coordinate.latitude), lng: Number(coordinate.longitude) }
        }, options || {}));
        overlays.push(marker);
      };
      var sync = function (state) {
        if (!map || !window.google) return;
        clear();
        map.setMapTypeId(state.mapType === "satellite" ? "satellite" : "roadmap");

        (state.savedFields || []).forEach(function (field) {
          var polygon = new google.maps.Polygon({
            map: map,
            paths: path(field.coordinates),
            fillColor: field.fillColor,
            fillOpacity: 1,
            strokeColor: field.strokeColor,
            strokeOpacity: 1,
            strokeWeight: field.focused ? 6 : 3,
            clickable: false,
            zIndex: field.focused ? 4 : 1
          });
          overlays.push(polygon);
          var points = field.coordinates || [];
          var labelPoint = points[Math.floor(points.length / 2)] || points[0];
          addMarker(labelPoint, {
            clickable: false,
            title: field.name,
            label: { text: field.name, color: "#ffffff", fontSize: "12px", fontWeight: "700" },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: field.focused ? 17 : 14,
              fillColor: field.strokeColor,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: field.focused ? 3 : 1
            },
            zIndex: field.focused ? 8 : 3
          });
        });

        if (state.drawingMode && (state.previewPath || []).length > 0) {
          if ((state.activePath || []).length >= 3) {
            var drawingPolygon = new google.maps.Polygon({
              map: map,
              paths: path(state.previewPath),
              fillColor: "#ff8a65",
              fillOpacity: 0.25,
              strokeColor: "#ff5722",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              clickable: false,
              zIndex: 10
            });
            overlays.push(drawingPolygon);
          }
          if ((state.activePath || []).length > 1) {
            var drawingLine = new google.maps.Polyline({
              map: map,
              path: path(state.previewPath),
              strokeColor: "#ff5722",
              strokeOpacity: 1,
              strokeWeight: 6,
              clickable: false,
              zIndex: 11
            });
            overlays.push(drawingLine);
          }
          (state.activePath || []).forEach(function (point, index) {
            addMarker(point, {
              clickable: false,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: index === 0 ? 8 : 7,
                fillColor: index === 0 ? "#16a34a" : "#ff5722",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3
              },
              zIndex: 20 + index
            });
          });
        } else if ((state.pendingPolygon || []).length > 2) {
          var pending = new google.maps.Polygon({
            map: map,
            paths: path(state.pendingPolygon),
            fillColor: "#ff8a65",
            fillOpacity: 0.25,
            strokeColor: "#ff7043",
            strokeOpacity: 1,
            strokeWeight: 3,
            clickable: false,
            zIndex: 10
          });
          overlays.push(pending);
        }

        addMarker(state.searchMarker, { zIndex: 30 });
        addMarker(state.userLocation, {
          clickable: false,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3
          },
          zIndex: 31
        });
      };

      window.MataniMap = {
        sync: sync,
        animateToRegion: function (region) {
          if (!map) return;
          var bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: region.latitude - region.latitudeDelta / 2, lng: region.longitude - region.longitudeDelta / 2 });
          bounds.extend({ lat: region.latitude + region.latitudeDelta / 2, lng: region.longitude + region.longitudeDelta / 2 });
          map.fitBounds(bounds, 0);
        },
        fitToCoordinates: function (coordinates, padding) {
          if (!map || !coordinates || coordinates.length === 0) return;
          var bounds = new google.maps.LatLngBounds();
          path(coordinates).forEach(function (point) { bounds.extend(point); });
          map.fitBounds(bounds, padding || 48);
        }
      };

      window.gm_authFailure = function () {
        post({ type: "error", message: "Google Maps menolak API key Web." });
      };
      window.initMataniMap = function () {
        map = new google.maps.Map(document.getElementById("map"), {
          center: { lat: initial.latitude, lng: initial.longitude },
          zoom: 16,
          mapTypeId: "satellite",
          disableDefaultUI: true,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: "greedy",
          tilt: 0
        });
        map.addListener("click", function (event) {
          post({ type: "press", coordinate: { latitude: event.latLng.lat(), longitude: event.latLng.lng() } });
        });
        map.addListener("drag", function () { post({ type: "drag" }); });
        map.addListener("idle", function () {
          var bounds = map.getBounds();
          var center = map.getCenter();
          if (!bounds || !center) return;
          var ne = bounds.getNorthEast();
          var sw = bounds.getSouthWest();
          var longitudeDelta = ne.lng() - sw.lng();
          if (longitudeDelta < 0) longitudeDelta += 360;
          post({
            type: "region",
            region: {
              latitude: center.lat(), longitude: center.lng(),
              latitudeDelta: Math.abs(ne.lat() - sw.lat()), longitudeDelta: longitudeDelta
            }
          });
        });
        post({ type: "ready" });
      };
    })();
  </script>
  <script async defer src="${scriptUrl}" onerror="window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:'Google Maps tidak dapat dimuat.'}))"></script>
</body>
</html>`;
};

export const GoogleMapsWebView = forwardRef<FieldMapHandle, Props>(
  function GoogleMapsWebView(
    {
      apiKey,
      initialRegion,
      mapType,
      drawingMode,
      activePath,
      previewPath,
      pendingPolygon,
      searchMarker,
      userLocation,
      savedFields,
      onPressCoordinate,
      onRegionChangeComplete,
      onMapReady,
      onPanDrag,
      onTouchStart,
      onTouchEnd,
    },
    forwardedRef,
  ) {
    const webViewRef = useRef<WebView>(null);
    const pendingScriptsRef = useRef<string[]>([]);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const normalizedKey = apiKey?.trim() ?? "";
    const html = useMemo(
      () => (normalizedKey ? buildMapHtml(normalizedKey, initialRegion) : ""),
      [initialRegion, normalizedKey],
    );

    const run = useCallback((script: string) => {
      if (!ready || !webViewRef.current) {
        pendingScriptsRef.current.push(script);
        return;
      }
      webViewRef.current.injectJavaScript(`${script};true;`);
    }, [ready]);

    useImperativeHandle(forwardedRef, () => ({
      animateToRegion(region) {
        run(`window.MataniMap&&window.MataniMap.animateToRegion(JSON.parse(decodeURIComponent("${encodePayload(region)}")))`);
      },
      fitToCoordinates(coordinates, options) {
        const padding = Math.max(
          24,
          options?.edgePadding?.top ?? 0,
          options?.edgePadding?.right ?? 0,
          options?.edgePadding?.bottom ?? 0,
          options?.edgePadding?.left ?? 0,
        );
        run(`window.MataniMap&&window.MataniMap.fitToCoordinates(JSON.parse(decodeURIComponent("${encodePayload(coordinates)}")),${padding})`);
      },
    }), [run]);

    useEffect(() => {
      if (!ready) return;
      const state = {
        mapType,
        drawingMode,
        activePath,
        previewPath,
        pendingPolygon,
        searchMarker,
        userLocation,
        savedFields,
      };
      run(`window.MataniMap&&window.MataniMap.sync(JSON.parse(decodeURIComponent("${encodePayload(state)}")))`);
    }, [activePath, drawingMode, mapType, pendingPolygon, previewPath, ready, run, savedFields, searchMarker, userLocation]);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as WebMessage;
        if (message.type === "ready") {
          setReady(true);
          setError(null);
          onMapReady();
          requestAnimationFrame(() => {
            const scripts = pendingScriptsRef.current.splice(0);
            scripts.forEach((script) => webViewRef.current?.injectJavaScript(`${script};true;`));
          });
        } else if (message.type === "press") {
          onPressCoordinate(message.coordinate);
        } else if (message.type === "region") {
          onRegionChangeComplete(message.region);
        } else if (message.type === "drag") {
          onPanDrag();
        } else if (message.type === "error") {
          const nextError = message.message ?? "Google Maps tidak dapat dimuat.";
          console.warn("Google Maps WebView:", nextError);
          setError(nextError);
        }
      } catch {
        setError("Respons Google Maps tidak dapat dibaca.");
      }
    }, [onMapReady, onPanDrag, onPressCoordinate, onRegionChangeComplete]);

    if (!normalizedKey) {
      return (
        <View style={styles.message}>
          <Text style={styles.messageTitle}>Google Maps Web belum dikonfigurasi</Text>
          <Text style={styles.messageText}>Tambahkan GOOGLE_MAPS_API_KEY_WEB untuk menjalankan peta Google di Expo Go iPhone.</Text>
        </View>
      );
    }

    return (
      <View style={styles.container} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <WebView
          ref={webViewRef}
          source={{ html, baseUrl: "https://matani-app-b26l.vercel.app" }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["https://*"]}
          onMessage={handleMessage}
          onError={() => setError("Koneksi ke Google Maps gagal.")}
          onHttpError={() => setError("Google Maps mengembalikan respons gagal.")}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          scrollEnabled={false}
        />
        {!ready && !error && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#166534" />
            <Text style={styles.loadingText}>Memuat Google Maps…</Text>
          </View>
        )}
        {error && (
          <View style={styles.message} pointerEvents="none">
            <Text style={styles.messageTitle}>Google Maps belum dapat dimuat</Text>
            <Text style={styles.messageText}>{error} Periksa Maps JavaScript API dan restriction key Web.</Text>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F3E8" },
  webView: { flex: 1, backgroundColor: "#E8F3E8" },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#E8F3E8",
  },
  loadingText: { color: "#166534", fontSize: 13, fontWeight: "700" },
  message: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#E8F3E8",
  },
  messageTitle: { color: "#14532D", fontSize: 15, fontWeight: "800", textAlign: "center" },
  messageText: { marginTop: 7, color: "#365D42", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
