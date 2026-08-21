import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DrawingModeIndicatorProps {
  onCancel: () => void;
  pointsCount: number;
}

export function DrawingModeIndicator({
  onCancel,
  pointsCount,
}: DrawingModeIndicatorProps) {
  return (
    <View style={styles.drawingModeIndicator}>
      <Ionicons name="create-outline" size={20} color="#FFFFFF" />
      <Text style={styles.drawingModeIndicatorText}>
        Mode Menggambar Aktif • {pointsCount} titik
      </Text>
      <TouchableOpacity
        onPress={onCancel}
        style={styles.drawingModeIndicatorClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  drawingModeIndicator: {
    position: "absolute",
    top: 16,
    left: 20,
    right: 20,
    backgroundColor: "#FF5722",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  drawingModeIndicatorText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  drawingModeIndicatorClose: {
    padding: 4,
  },
});
