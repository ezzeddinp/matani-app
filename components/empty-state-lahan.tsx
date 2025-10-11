import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EmptyStateLahanProps {
  onStartDrawing: () => void;
}

export function EmptyStateLahan({ onStartDrawing }: EmptyStateLahanProps) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="leaf-outline" size={80} color="#4CAF50" />
      </View>

      <Text style={styles.emptyStateTitle}>Belum Ada Lahan</Text>

      <Text style={styles.emptyStateDescription}>
        Mulai perjalanan pertanian Anda dengan menggambar lahan pertama Anda di
        peta
      </Text>

      <TouchableOpacity
        style={styles.emptyStateCTA}
        onPress={onStartDrawing}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyStateCTAText}>Gambar Lahan Pertama</Text>
      </TouchableOpacity>

      <View style={styles.emptyStateStepsContainer}>
        <Text style={styles.emptyStateStepsTitle}>Cara Menggambar Lahan</Text>

        <View style={styles.emptyStateStep}>
          <View style={styles.emptyStateStepNumber}>
            <Text style={styles.emptyStateStepNumberText}>1</Text>
          </View>
          <View style={styles.emptyStateStepContent}>
            <Text style={styles.emptyStateStepText}>
              Tekan tombol &ldquo;Gambar Lahan Pertama&rdquo; atau tombol hijau
              di atas
            </Text>
          </View>
        </View>

        <View style={styles.emptyStateStep}>
          <View style={styles.emptyStateStepNumber}>
            <Text style={styles.emptyStateStepNumberText}>2</Text>
          </View>
          <View style={styles.emptyStateStepContent}>
            <Text style={styles.emptyStateStepText}>
              Ketuk pada peta untuk menandai sudut-sudut lahan Anda
            </Text>
          </View>
        </View>

        <View style={styles.emptyStateStep}>
          <View style={styles.emptyStateStepNumber}>
            <Text style={styles.emptyStateStepNumberText}>3</Text>
          </View>
          <View style={styles.emptyStateStepContent}>
            <Text style={styles.emptyStateStepText}>
              Tekan tombol &ldquo;Selesai&rdquo; dan beri nama lahan Anda
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    marginVertical: 16,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#263238",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#607D8B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateCTA: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 40,
  },
  emptyStateCTAText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyStateStepsContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateStepsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#263238",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyStateStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  emptyStateStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyStateStepNumberText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyStateStepContent: {
    flex: 1,
    paddingTop: 4,
  },
  emptyStateStepText: {
    fontSize: 15,
    color: "#263238",
    lineHeight: 22,
  },
});
