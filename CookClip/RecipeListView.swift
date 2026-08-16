import SwiftUI

struct RecipeListView: View {
    @EnvironmentObject private var store: RecipeStore
    @State private var showingNewRecipe = false
    @State private var searchText = ""
    @State private var selectedCategory = "Wszystkie"
    @State private var favoritesOnly = false

    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    private var filteredRecipes: [Recipe] {
        store.recipes.filter { recipe in
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let matchesSearch = query.isEmpty || recipe.title.localizedCaseInsensitiveContains(query) || recipe.ingredients.map(\.name).joined(separator: " ").localizedCaseInsensitiveContains(query)
            let matchesCategory = selectedCategory == "Wszystkie" || recipe.category == selectedCategory
            let matchesFavorite = !favoritesOnly || recipe.isFavorite
            return matchesSearch && matchesCategory && matchesFavorite
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    categoryStrip

                    if filteredRecipes.isEmpty {
                        ContentUnavailableView(
                            "Brak przepisów",
                            systemImage: "fork.knife",
                            description: Text("Dodaj pierwszy przepis przyciskiem +.")
                        )
                        .padding(.top, 70)
                    } else {
                        LazyVGrid(columns: columns, spacing: 14) {
                            ForEach(filteredRecipes) { recipe in
                                NavigationLink(value: recipe.id) {
                                    RecipeCardView(recipe: recipe)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .navigationTitle("CookClip")
            .searchable(text: $searchText, prompt: "Szukaj przepisu lub składnika")
            .navigationDestination(for: UUID.self) { id in
                RecipeDetailView(recipeID: id)
            }
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        favoritesOnly.toggle()
                    } label: {
                        Image(systemName: favoritesOnly ? "heart.fill" : "heart")
                    }
                    .accessibilityLabel("Tylko ulubione")

                    Button {
                        showingNewRecipe = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Dodaj przepis")
                }
            }
            .sheet(isPresented: $showingNewRecipe) {
                NavigationStack { RecipeEditorView(mode: .new) }
            }
        }
    }

    private var categoryStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Recipe.categories, id: \.self) { category in
                    Button(category) { selectedCategory = category }
                        .buttonStyle(.borderedProminent)
                        .tint(selectedCategory == category ? .orange : .gray.opacity(0.25))
                        .foregroundStyle(selectedCategory == category ? .white : .primary)
                }
            }
            .padding(.vertical, 4)
        }
    }
}

struct RecipeCardView: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 18)
                    .fill(.orange.opacity(0.14))
                    .aspectRatio(1.35, contentMode: .fit)
                    .overlay {
                        Image(systemName: recipe.videoFileName == nil ? "fork.knife" : "play.rectangle.fill")
                            .font(.system(size: 36, weight: .semibold))
                            .foregroundStyle(.orange)
                    }

                if recipe.isFavorite {
                    Image(systemName: "heart.fill")
                        .foregroundStyle(.red)
                        .padding(10)
                        .background(.ultraThinMaterial, in: Circle())
                        .padding(8)
                }
            }

            Text(recipe.title)
                .font(.headline)
                .lineLimit(2)

            HStack(spacing: 8) {
                Label("\(recipe.totalMinutes) min", systemImage: "clock")
                Spacer(minLength: 0)
                Label("\(recipe.servings)", systemImage: "person.2")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(10)
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
    }
}
