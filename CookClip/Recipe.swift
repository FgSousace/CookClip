import Foundation

struct Recipe: Identifiable, Codable, Equatable {
    var id = UUID()
    var title: String
    var ingredients: [String]
    var steps: [String]
    var notes: String
    var videoFileName: String?
    var createdAt = Date()
    var updatedAt = Date()

    static let sample = Recipe(
        title: "Makaron carbonara",
        ingredients: ["200 g spaghetti", "2 jajka", "80 g guanciale lub boczku", "50 g pecorino", "Pieprz"],
        steps: [
            "Ugotuj makaron al dente.",
            "Podsmaż guanciale lub boczek.",
            "Wymieszaj jajka z serem i pieprzem.",
            "Połącz wszystko poza ogniem, dodając odrobinę wody z makaronu."
        ],
        notes: "Sos ma być kremowy, bez śmietany.",
        videoFileName: nil
    )
}
