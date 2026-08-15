import AVKit
import SwiftUI

struct RecipeDetailView: View {
    @EnvironmentObject private var store: RecipeStore
    let recipeID: UUID
    @State private var showingEditor = false

    private var recipe: Recipe? { store.recipes.first { $0.id == recipeID } }

    var body: some View {
        Group {
            if let recipe {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        if let fileName = recipe.videoFileName {
                            VideoPlayer(player: AVPlayer(url: store.videoURL(for: fileName)))
                                .frame(minHeight: 220)
                                .clipShape(RoundedRectangle(cornerRadius: 18))
                        }

                        section("Składniki", icon: "basket") {
                            ForEach(Array(recipe.ingredients.enumerated()), id: \.offset) { _, ingredient in
                                Label(ingredient, systemImage: "checkmark.circle")
                            }
                        }

                        section("Przygotowanie", icon: "list.number") {
                            ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                                HStack(alignment: .top, spacing: 12) {
                                    Text("\(index + 1)")
                                        .font(.headline)
                                        .frame(width: 30, height: 30)
                                        .background(.orange.opacity(0.15), in: Circle())
                                    Text(step).padding(.top, 4)
                                }
                            }
                        }

                        if !recipe.notes.isEmpty {
                            section("Notatki", icon: "note.text") { Text(recipe.notes) }
                        }
                    }
                    .padding()
                }
                .navigationTitle(recipe.title)
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    Button("Edytuj") { showingEditor = true }
                }
                .sheet(isPresented: $showingEditor) {
                    NavigationStack { RecipeEditorView(mode: .edit(recipe)) }
                }
            } else {
                ContentUnavailableView("Nie znaleziono przepisu", systemImage: "exclamationmark.triangle")
            }
        }
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon).font(.title2.bold())
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
