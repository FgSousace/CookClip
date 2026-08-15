import SwiftUI

@main
struct CookClipApp: App {
    @StateObject private var store = RecipeStore()

    var body: some Scene {
        WindowGroup {
            RecipeListView()
                .environmentObject(store)
        }
    }
}
