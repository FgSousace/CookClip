import SwiftUI
import UniformTypeIdentifiers

enum RecipeEditorMode {
    case new
    case edit(Recipe)
}

struct RecipeEditorView: View {
    @EnvironmentObject private var store: RecipeStore
    @Environment(\.dismiss) private var dismiss

    let mode: RecipeEditorMode

    @State private var recipe: Recipe
    @State private var videoQuality: VideoQuality = .recommended720
    @State private var showingVideoImporter = false
    @State private var isCompressing = false
    @State private var errorMessage: String?

    init(mode: RecipeEditorMode) {
        self.mode = mode
        switch mode {
        case .new:
            _recipe = State(initialValue: Recipe(
                title: "",
                category: "Obiad",
                servings: 2,
                ingredients: [Ingredient(name: "", amount: nil, unit: "g")],
                steps: [RecipeStep(text: "", videoTimestampSeconds: nil)],
                prepMinutes: 0,
                cookMinutes: 0,
                sourceName: "",
                sourceURL: "",
                notes: "",
                nutritionPerServing: Nutrition(),
                videoFileName: nil
            ))
        case .edit(let existing):
            _recipe = State(initialValue: existing)
        }
    }

    private var isNew: Bool {
        if case .new = mode { return true }
        return false
    }

    private var canSave: Bool {
        !recipe.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        (!isNew || recipe.videoFileName != nil) &&
        !isCompressing
    }

    var body: some View {
        Form {
            Section("Podstawowe") {
                TextField("Nazwa dania", text: $recipe.title)

                Picker("Kategoria", selection: $recipe.category) {
                    ForEach(Recipe.categories.filter { $0 != "Wszystkie" }, id: \.self) { category in
                        Text(category).tag(category)
                    }
                }

                Stepper("Porcje: \(recipe.servings)", value: $recipe.servings, in: 1...30)
                Toggle("Ulubiony", isOn: $recipe.isFavorite)
            }

            Section("Film instruktażowy") {
                Picker("Kompresja", selection: $videoQuality) {
                    ForEach(VideoQuality.allCases) { quality in
                        Text(quality.rawValue).tag(quality)
                    }
                }

                Button {
                    showingVideoImporter = true
                } label: {
                    Label(recipe.videoFileName == nil ? "Dodaj film" : "Zmień film", systemImage: "video.badge.plus")
                }

                if isCompressing {
                    ProgressView("Kompresowanie filmu…")
                } else if recipe.videoFileName != nil {
                    Label("Film gotowy", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else {
                    Label("Film jest wymagany", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                }
            }

            Section("Składniki") {
                ForEach($recipe.ingredients) { $ingredient in
                    VStack(alignment: .leading, spacing: 8) {
                        TextField("Składnik", text: $ingredient.name)
                        HStack {
                            TextField("Ilość", value: $ingredient.amount, format: .number)
                                .keyboardType(.decimalPad)
                            TextField("Jednostka", text: $ingredient.unit)
                        }
                    }
                }
                .onDelete { recipe.ingredients.remove(atOffsets: $0) }

                Button("Dodaj składnik", systemImage: "plus") {
                    recipe.ingredients.append(Ingredient(name: "", amount: nil, unit: "g"))
                }
            }

            Section("Kroki") {
                ForEach($recipe.steps) { $step in
                    VStack(alignment: .leading, spacing: 8) {
                        TextField("Opis kroku", text: $step.text, axis: .vertical)
                            .lineLimit(2...6)
                        TextField("Timestamp filmu w sekundach", value: $step.videoTimestampSeconds, format: .number)
                            .keyboardType(.decimalPad)
                    }
                }
                .onDelete { recipe.steps.remove(atOffsets: $0) }

                Button("Dodaj krok", systemImage: "plus") {
                    recipe.steps.append(RecipeStep(text: "", videoTimestampSeconds: nil))
                }
            }

            Section("Czas") {
                Stepper("Przygotowanie: \(recipe.prepMinutes) min", value: $recipe.prepMinutes, in: 0...600)
                Stepper("Gotowanie: \(recipe.cookMinutes) min", value: $recipe.cookMinutes, in: 0...600)
                LabeledContent("Łącznie", value: "\(recipe.totalMinutes) min")
            }

            Section("Źródło") {
                TextField("Nazwa źródła", text: $recipe.sourceName)
                TextField("Link", text: $recipe.sourceURL)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
            }

            Section("Wartości odżywcze / 1 porcja") {
                nutritionField("Kalorie", value: $recipe.nutritionPerServing.calories, unit: "kcal")
                nutritionField("Białko", value: $recipe.nutritionPerServing.protein, unit: "g")
                nutritionField("Tłuszcz", value: $recipe.nutritionPerServing.fat, unit: "g")
                nutritionField("Węglowodany", value: $recipe.nutritionPerServing.carbs, unit: "g")
                nutritionField("Błonnik", value: $recipe.nutritionPerServing.fiber, unit: "g")
                nutritionField("Cukry", value: $recipe.nutritionPerServing.sugars, unit: "g")
                nutritionField("Sól", value: $recipe.nutritionPerServing.salt, unit: "g")
            }

            Section("Notatki") {
                TextField("Notatki", text: $recipe.notes, axis: .vertical)
                    .lineLimit(3...10)
            }
        }
        .navigationTitle(isNew ? "Nowy przepis" : "Edytuj przepis")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Anuluj") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Zapisz") { save() }
                    .disabled(!canSave)
            }
        }
        .fileImporter(
            isPresented: $showingVideoImporter,
            allowedContentTypes: [.movie],
            allowsMultipleSelection: false
        ) { result in
            handleVideoSelection(result)
        }
        .alert("Błąd", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "Nieznany błąd")
        }
    }

    @ViewBuilder
    private func nutritionField(_ title: String, value: Binding<Double>, unit: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            TextField("0", value: value, format: .number.precision(.fractionLength(0...2)))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 90)
            Text(unit)
                .foregroundStyle(.secondary)
        }
    }

    private func handleVideoSelection(_ result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            errorMessage = error.localizedDescription
        case .success(let urls):
            guard let url = urls.first else { return }
            Task {
                isCompressing = true
                let scoped = url.startAccessingSecurityScopedResource()
                defer {
                    if scoped { url.stopAccessingSecurityScopedResource() }
                    isCompressing = false
                }

                do {
                    let oldFile = recipe.videoFileName
                    let newFile = try await store.importAndCompressVideo(from: url, quality: videoQuality)
                    recipe.videoFileName = newFile
                    if let oldFile, oldFile != newFile {
                        try? FileManager.default.removeItem(at: store.videoURL(for: oldFile))
                    }
                } catch {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func save() {
        recipe.ingredients.removeAll { $0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        recipe.steps.removeAll { $0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

        switch mode {
        case .new:
            store.add(recipe)
        case .edit:
            store.update(recipe)
        }
        dismiss()
    }
}
