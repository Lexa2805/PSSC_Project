// Mapping of product codes to their image filenames
export const bookImageMap: Record<string, string> = {
    // Learn / Education
    'LEARN-001': '/books/clean_code.jpeg',
    'LEARN-002': '/books/Domain_Driven_Design.jpeg',
    'LEARN-003': '/books/The_Pragmatic_Programmer.jpeg',
    'LEARN-004': '/books/Refactoring.jpeg',
    'LEARN-005': '/books/Design_Patterns.jpeg',
    'LEARN-006': '/books/Head_First_Design_Patterns.jpeg',
    'LEARN-007': '/books/Structure_and_Interpretation .jpeg',
    'LEARN-008': '/books/Introduction_to_Algorithms.jpeg',

    // Psychology
    'PSYCH-001': '/books/Thinking_Fast_and_Slow.jpeg',
    'PSYCH-002': '/books/Atomic_Habits.jpeg',
    'PSYCH-003': '/books/The_Power_of_Habit.jpeg',
    'PSYCH-004': '/books/Influence_The_Psychology_of_persuasion.jpeg',
    'PSYCH-005': '/books/Man\'s_Search_for_Meaning.jpeg',
    'PSYCH-006': '/books/Emotional_Intelligence.jpeg',
    'PSYCH-007': '/books/The_Subtle_Art_of_Not_Giving_a.jpeg',
    'PSYCH-008': '/books/Mindset_The_New_Psycholo.jpeg',

    // Romance
    'ROM-001': '/books/Pride_and_Prejudice.jpeg',
    'ROM-002': '/books/The_Notebook.jpeg',
    'ROM-003': '/books/Outlander.jpeg',
    'ROM-004': '/books/Me_Before_You.jpeg',
    'ROM-005': '/books/The Fault in Our Stars.jpeg',
    'ROM-006': '/books/It_Ends_with_Us.jpeg',
    'ROM-007': '/books/Beach_Read.jpeg',
    'ROM-008': '/books/The_Hating_Game.jpeg',

    // Sci-Fi
    'SF-001': '/books/Dune.jpeg',
    'SF-002': '/books/Foundation.jpeg',
    'SF-003': '/books/Neuromancer.jpeg',
    'SF-004': '/books/The_Martian.jpeg',
    'SF-005': '/books/Ender\'s_Game.jpeg',
    'SF-006': '/books/1984.jpeg',
    'SF-007': '/books/Brave_New_World.jpeg',
    'SF-008': '/books/Project_Hail_Mary.jpeg',
    'SF-009': '/books/Snow_Crash.jpeg',

    // Thriller
    'THRILL-001': '/books/The Girl with the Dragon Tattoo.jpeg',
    'THRILL-002': '/books/Gone_Girl.jpeg',
    'THRILL-003': '/books/The_Da_Vinci_Code.jpeg',
    'THRILL-004': '/books/The_Silent_Patient.jpeg',
    'THRILL-005': '/books/Sharp_Objects.jpeg',
    'THRILL-006': '/books/The_Girl_on_the_Train.jpeg',
    'THRILL-007': '/books/Big_Little_Lies.jpeg',

    // Fantasy
    'FANT-001': '/books/the_lord_of_the_rings.jpeg',
    'FANT-002': '/books/harry_potter_and_the_sorcer.jpeg',
    'FANT-003': '/books/a_game_of_thronesjpeg.jpeg',
    'FANT-004': '/books/the_name_of_the_wind.jpeg',
    'FANT-005': '/books/the_way_of_kings_pime.jpeg',
    'FANT-006': '/books/The_hobbit.jpeg',
    'FANT-007': '/books/mistborn_the_final_empire.jpeg',
    'FANT-008': '/books/the_chronicles_of_narnia.jpeg',

    // Business
    'BUS-001': '/books/the_lean_startup.jpeg',
    'BUS-002': '/books/zero_to_one.jpeg',
    'BUS-003': '/books/good_to_great.jpeg',
    'BUS-004': '/books/the_7_habits_of_highly_effective_people.jpeg',
    'BUS-005': '/books/rich_dad_poor_dad.jpeg',
    'BUS-006': '/books/think_and_grow_rich.jpeg',
    'BUS-007': '/books/the_4_hour_workweek.jpeg',
};

export function getBookImage(productCode: string): string | null {
    return bookImageMap[productCode] || null;
}
