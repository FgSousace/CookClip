import Foundation

struct Ingredient: Identifiable, Codable, Equatable {
    var id = UUID()
    var name: String
    var amount: Double?
    var unit: String

    func displayAmount(multiplier: Double) -> String {
        guard let amount else { return name }
        let scaled = amount * multiplier
        let formatted = scaled.formatted(.number.precision(.fractionLength(0...2)))
        return "\(formatted) \(unit) \(name)".replacingOccurrences(of: "  ", with: " ")
    }
}

struct RecipeStep: Identifiable, Codable, Equatable {
    var id = UUID()
    var text: String
    var videoTimestampSeconds: Double?
}

struct Nutrition: Codable, Equatable {
    var calories: Double = 0
    var protein: Double = 0
    var fat: Double = 0
    var carbs: Double = 0
    var fiber: Double = 0
    var sugars: Double = 0
    var salt: Double = 0
}

struct Recipe: Identifiable, Codable, Equatable {
    var id = UUID()
    var title: String
    var category: String
    var isFavorite: Bool = false
    var servings: Int
    var ingredients: [Ingredient]
    var steps: [RecipeStep]
    var prepMinutes: Int
    var cookMinutes: Int
    var sourceName: String
    var sourceURL: String
    var notes: String
    var nutritionPerServing: Nutrition
    var videoFileName: String?
    var createdAt = Date()
    var updatedAt = Date()

    var totalMinutes: Int { prepMinutes + cookMinutes }

    static let categories = ["Wszystkie", "Śniadanie", "Obiad", "Kolacja", "Deser", "Przekąska", "Inne"]

    static let sample = Recipe(
        title: "Makaron carbonara",
        category: "Obiad",
        isFavorite: true,
        servings: 2,
        ingredients: [
            Ingredient(name: "spaghetti", amount: 200, unit: "g"),
            Ingredient(name: "jajka", amount: 2, unit: "szt."),
            Ingredient(name: "guanciale lub boczek", amount: 80, unit: "g"),
            Ingredient(name: "pecorino", amount: 50, unit: "g"),
            Ingredient(name: "pieprz", amount: nil, unit: "")
        ],
        steps: [
            RecipeStep(text: "Ugotuj makaron al dente.", videoTimestampSeconds: 8),
            RecipeStep(text: "Podsmaż guanciale lub boczek.", videoTimestampSeconds: 28),
            RecipeStep(text: "Wymieszaj jajka z serem i pieprzem.", videoTimestampSeconds: 49),
            RecipeStep(text: "Połącz wszystko poza ogniem, dodając odrobinę wody z makaronu.", videoTimestampSeconds: 72)
        ],
        prepMinutes: 10,
        cookMinutes: 15,
        sourceName: "Własny przepis",
        sourceURL: "",
        notes: "Sos ma być kremowy, bez śmietany.",
        nutritionPerServing: Nutrition(calories: 640, protein: 31, fat: 27, carbs: 68, fiber: 3, sugars: 2, salt: 1.4),
        videoFileName: nil
    )
}
