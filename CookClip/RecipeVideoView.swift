import AVKit
import SwiftUI

struct RecipeVideoView: View {
    let url: URL
    @Binding var seekSeconds: Double?
    @State private var player: AVPlayer

    init(url: URL, seekSeconds: Binding<Double?>) {
        self.url = url
        self._seekSeconds = seekSeconds
        _player = State(initialValue: AVPlayer(url: url))
    }

    var body: some View {
        VideoPlayer(player: player)
            .onChange(of: seekSeconds) { _, newValue in
                guard let newValue else { return }
                let time = CMTime(seconds: newValue, preferredTimescale: 600)
                player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
                player.play()
                seekSeconds = nil
            }
            .onDisappear {
                player.pause()
            }
    }
}
