import SwiftUI

struct RecipeListView: View {
    @EnvironmentObject private var store: RecipeStore
    @State private var showingNewRecipe = false
    @State private var searchText = ""

    private var filteredRecipes: [Recipe] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return store.recipes }
        return store.recipes.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.ingredients.joined(separator: " ").localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if filteredRecipes.isEmpty {
                    ContentUnavailableView(
                        "Brak przepisów",
                        systemImage: "fork.knife",
                        description: Text("Dodaj pierwszy przepis przyciskiem +.")
                    )
                } else {
                    List {
                        ForEach(filteredRecipes) { recipe in
                            NavigationLink {
                                RecipeDetailView(recipeID: recipe.id)
                            } label: {
                                HStack(spacing: 14) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(.orange.opacity(0.15))
                                        Image(systemName: recipe.videoFileName == nil ? "fork.knife" : "play.rectangle.fill")
                                            .font(.title2)
                                            .foregroundStyle(.orange)
                                    }
                                    .frame(width: 58, height: 58)

                                    VStack(alignment: .leading, spacing: 5) {
                                        Text(recipe.title)
                                            .font(.headline)
                                        Text("\(recipe.ingredients.count) składników • \(recipe.steps.count) kroków")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }
                        .onDelete(perform: deleteFiltered)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("CookClip")
            .searchable(text: $searchText, prompt: "Szukaj przepisu lub składnika")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingNewRecipe = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Dodaj przepis")
                }
            }
            .sheet(isPresented: $showingNewRecipe) {
                NavigationStack {
                    RecipeEditorView(mode: .new)
                }
            }
        }
    }

    private func deleteFiltered(at offsets: IndexSet) {
        let ids = offsets.map { filteredRecipes[$0].id }
        let storeOffsets = IndexSet(store.recipes.indices.filter { ids.contains(store.recipes[$0].id) })
        store.delete(at: storeOffsets)
    }
}
