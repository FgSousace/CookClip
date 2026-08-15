import Foundation

@MainActor
final class RecipeStore: ObservableObject {
    @Published var recipes: [Recipe] = [] {
        didSet { save() }
    }

    private let fileURL: URL

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("CookClip", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        fileURL = dir.appendingPathComponent("recipes.json")
        load()
    }

    func add(_ recipe: Recipe) {
        recipes.insert(recipe, at: 0)
    }

    func update(_ recipe: Recipe) {
        guard let index = recipes.firstIndex(where: { $0.id == recipe.id }) else { return }
        var updated = recipe
        updated.updatedAt = Date()
        recipes[index] = updated
    }

    func delete(at offsets: IndexSet) {
        let removed = offsets.map { recipes[$0] }
        recipes.remove(atOffsets: offsets)
        for recipe in removed {
            guard let name = recipe.videoFileName else { continue }
            try? FileManager.default.removeItem(at: videoURL(for: name))
        }
    }

    func videoURL(for fileName: String) -> URL {
        fileURL.deletingLastPathComponent().appendingPathComponent(fileName)
    }

    func importAndCompressVideo(from sourceURL: URL) async throws -> String {
        let fileName = "video-\(UUID().uuidString).mp4"
        let destination = videoURL(for: fileName)
        try await VideoCompressor.compress(sourceURL: sourceURL, destinationURL: destination)
        return fileName
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? JSONDecoder().decode([Recipe].self, from: data) else {
            recipes = [Recipe.sample]
            return
        }
        recipes = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(recipes) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
