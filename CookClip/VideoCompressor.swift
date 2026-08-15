import AVFoundation
import Foundation

enum VideoQuality: String, CaseIterable, Identifiable {
    case economy540 = "Oszczędny 540p"
    case recommended720 = "Polecany 720p"
    case high1080 = "Wysoki 1080p"

    var id: String { rawValue }

    var preset: String {
        switch self {
        case .economy540: return AVAssetExportPreset960x540
        case .recommended720: return AVAssetExportPreset1280x720
        case .high1080: return AVAssetExportPreset1920x1080
        }
    }
}

enum VideoCompressionError: LocalizedError {
    case exporterUnavailable
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case .exporterUnavailable:
            return "Nie udało się przygotować kompresji filmu."
        case .exportFailed(let message):
            return "Kompresja filmu nie powiodła się: \(message)"
        }
    }
}

enum VideoCompressor {
    static func compress(sourceURL: URL, destinationURL: URL, quality: VideoQuality) async throws {
        try? FileManager.default.removeItem(at: destinationURL)

        let asset = AVURLAsset(url: sourceURL)
        guard let exporter = AVAssetExportSession(asset: asset, presetName: quality.preset) else {
            throw VideoCompressionError.exporterUnavailable
        }

        exporter.outputURL = destinationURL
        exporter.outputFileType = .mp4
        exporter.shouldOptimizeForNetworkUse = true

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            exporter.exportAsynchronously {
                switch exporter.status {
                case .completed:
                    continuation.resume()
                case .failed, .cancelled:
                    continuation.resume(throwing: VideoCompressionError.exportFailed(exporter.error?.localizedDescription ?? "nieznany błąd"))
                default:
                    continuation.resume(throwing: VideoCompressionError.exportFailed("nieoczekiwany stan eksportu"))
                }
            }
        }
    }
}
