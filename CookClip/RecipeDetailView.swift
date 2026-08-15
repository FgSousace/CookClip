import AVKit
import SwiftUI

struct RecipeDetailView: View {
    @EnvironmentObject private var store: RecipeStore
    @Environment(\.dismiss) private var dismiss
    let recipeID: UUID

    @State private var showingEditor = false
    @State private var servings = 1
    @State private var checkedIngredients: Set<UUID> = []
    @State private var seekSeconds: Double?
    @State private var showingDeleteAlert = false

    private var recipe: Recipe? { store.recipes.first { $0.id == recipeID } }

    private var multiplier: Double {
        guard let recipe else { return 1 }
        return Double(servings) / Double(max(recipe.servings, 1))
    }

    var body: some View {
        Group {
            if let recipe {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        if let fileName = recipe.videoFileName {
                            RecipeVideoView(url: store.videoURL(for: fileName), seekSeconds: $seekSeconds)
                                .frame(minHeight: 220)
                                .clipShape(RoundedRectangle(cornerRadius: 18))
                        } else {
                            RoundedRectangle(cornerRadius: 18)
                                .fill(.orange.opacity(0.12))
                                .frame(height: 220)
                                .overlay {
                                    Label("Brak filmu", systemImage: "video.slash")
                                        .foregroundStyle(.secondary)
                                }
                        }

                        HStack {
                            Label(recipe.category, systemImage: "tag")
                            Spacer()
                            Label("\(recipe.totalMinutes) min", systemImage: "clock")
                        }
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                        servingsControl(recipe)

                        section("Składniki", icon: "basket") {
                            ForEach(recipe.ingredients) { ingredient in
                                Button {
                                    if checkedIngredients.contains(ingredient.id) {
                                        checkedIngredients.remove(ingredient.id)
                                    } else {
                                        checkedIngredients.insert(ingredient.id)
                                    }
                                } label: {
                                    HStack(alignment: .top, spacing: 10) {
                                        Image(systemName: checkedIngredients.contains(ingredient.id) ? "checkmark.circle.fill" : "circle")
                                            .foregroundStyle(checkedIngredients.contains(ingredient.id) ? .green : .secondary)
                                        Text(ingredient.displayAmount(multiplier: multiplier))
                                            .strikethrough(checkedIngredients.contains(ingredient.id))
                                            .foregroundStyle(.primary)
                                        Spacer()
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        section("Przygotowanie", icon: "list.number") {
                            ForEach(Array(recipe.steps.enumerated()), id: \.element.id) { index, step in
                                HStack(alignment: .top, spacing: 12) {
                                    Text("\(index + 1)")
                                        .font(.headline)
                                        .frame(width: 32, height: 32)
                                        .background(.orange.opacity(0.15), in: Circle())

                                    VStack(alignment: .leading, spacing: 7) {
                                        Text(step.text)
                                        if let timestamp = step.videoTimestampSeconds, recipe.videoFileName != nil {
                                            Button {
                                                seekSeconds = timestamp
                                            } label: {
                                                Label(formatTimestamp(timestamp), systemImage: "play.circle")
                                            }
                                            .font(.caption.bold())
                                        }
                                    }
                                }
                            }
                        }

                        section("Czas", icon: "timer") {
                            LabeledContent("Przygotowanie", value: "\(recipe.prepMinutes) min")
                            LabeledContent("Gotowanie", value: "\(recipe.cookMinutes) min")
                            LabeledContent("Łącznie", value: "\(recipe.totalMinutes) min")
                        }

                        nutritionSection(recipe)

                        if !recipe.sourceName.isEmpty || !recipe.sourceURL.isEmpty {
                            section("Źródło", icon: "link") {
                                if !recipe.sourceName.isEmpty { Text(recipe.sourceName) }
                                if let url = URL(string: recipe.sourceURL), !recipe.sourceURL.isEmpty {
                                    Link("Otwórz link źródłowy", destination: url)
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
                .onAppear {
                    if servings == 1 { servings = max(recipe.servings, 1) }
                }
                .toolbar {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button {
                            store.toggleFavorite(recipeID)
                        } label: {
                            Image(systemName: recipe.isFavorite ? "heart.fill" : "heart")
                                .foregroundStyle(recipe.isFavorite ? .red : .primary)
                        }

                        Menu {
                            Button("Edytuj", systemImage: "pencil") { showingEditor = true }
                            Button("Usuń", systemImage: "trash", role: .destructive) { showingDeleteAlert = true }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
                .sheet(isPresented: $showingEditor) {
                    NavigationStack { RecipeEditorView(mode: .edit(recipe)) }
                }
                .alert("Usunąć przepis?", isPresented: $showingDeleteAlert) {
                    Button("Usuń", role: .destructive) {
                        store.delete(recipeID)
                        dismiss()
                    }
                    Button("Anuluj", role: .cancel) { }
                } message: {
                    Text("Przepis i zapisany lokalnie film zostaną usunięte.")
                }
            } else {
                ContentUnavailableView("Nie znaleziono przepisu", systemImage: "exclamationmark.triangle")
            }
        }
    }

    private func servingsControl(_ recipe: Recipe) -> some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Porcje").font(.caption).foregroundStyle(.secondary)
                Text("\(servings)").font(.title2.bold())
            }
            Spacer()
            Button { servings = max(1, servings - 1) } label: {
                Image(systemName: "minus").frame(width: 36, height: 36)
            }
            .buttonStyle(.bordered)
            Button { servings = min(30, servings + 1) } label: {
                Image(systemName: "plus").frame(width: 36, height: 36)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
        .padding()
        .background(.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
    }

    @ViewBuilder
    private func nutritionSection(_ recipe: Recipe) -> some View {
        section("Wartości odżywcze", icon: "chart.bar") {
            Grid(alignment: .leading, horizontalSpacing: 14, verticalSpacing: 9) {
                GridRow {
                    Text("").bold()
                    Text("1 porcja").bold()
                    Text("Całość").bold()
                }
                nutritionRow("Kalorie", recipe.nutritionPerServing.calories, "kcal")
                nutritionRow("Białko", recipe.nutritionPerServing.protein, "g")
                nutritionRow("Tłuszcz", recipe.nutritionPerServing.fat, "g")
                nutritionRow("Węglowodany", recipe.nutritionPerServing.carbs, "g")
                nutritionRow("Błonnik", recipe.nutritionPerServing.fiber, "g")
                nutritionRow("Cukry", recipe.nutritionPerServing.sugars, "g")
                nutritionRow("Sól", recipe.nutritionPerServing.salt, "g")
            }
            .font(.subheadline)
        }
    }

    private func nutritionRow(_ title: String, _ perServing: Double, _ unit: String) -> some View {
        GridRow {
            Text(title)
            Text("\(formatted(perServing)) \(unit)")
            Text("\(formatted(perServing * Double(servings))) \(unit)")
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

    private func formatted(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0...2)))
    }

    private func formatTimestamp(_ seconds: Double) -> String {
        let total = max(Int(seconds), 0)
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}
