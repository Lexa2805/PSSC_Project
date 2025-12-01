using Microsoft.EntityFrameworkCore;
using PSSC.Sales.Api.Infrastructure.Persistence.Entities;

namespace PSSC.Sales.Api.Infrastructure.Persistence;

public class SalesDbContext : DbContext
{
    public SalesDbContext(DbContextOptions<SalesDbContext> options) : base(options)
    {
    }

    public DbSet<OrderEntity> Orders => Set<OrderEntity>();
    public DbSet<OrderLineEntity> OrderLines => Set<OrderLineEntity>();
    public DbSet<ProductEntity> Products => Set<ProductEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Order configuration
        modelBuilder.Entity<OrderEntity>(entity =>
        {
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.PlacedAt);

            entity.HasMany(e => e.Lines)
                .WithOne(e => e.Order)
                .HasForeignKey(e => e.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // OrderLine configuration
        modelBuilder.Entity<OrderLineEntity>(entity =>
        {
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.ProductCode);
        });

        // Product configuration
        modelBuilder.Entity<ProductEntity>(entity =>
        {
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Category);
        });

        // Seed books across multiple categories
        var now = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<ProductEntity>().HasData(
            // === LEARN / EDUCATION ===
            new ProductEntity { Code = "LEARN-001", Name = "Clean Code", Description = "A Handbook of Agile Software Craftsmanship", Category = "Learn", Author = "Robert C. Martin", Price = 89.99m, StockQuantity = 100, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-002", Name = "Domain-Driven Design", Description = "Tackling Complexity in the Heart of Software", Category = "Learn", Author = "Eric Evans", Price = 119.99m, StockQuantity = 50, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-003", Name = "The Pragmatic Programmer", Description = "Your Journey to Mastery - 20th Anniversary Edition", Category = "Learn", Author = "David Thomas & Andrew Hunt", Price = 99.99m, StockQuantity = 75, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-004", Name = "Refactoring", Description = "Improving the Design of Existing Code", Category = "Learn", Author = "Martin Fowler", Price = 109.99m, StockQuantity = 60, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-005", Name = "Design Patterns", Description = "Elements of Reusable Object-Oriented Software", Category = "Learn", Author = "Gang of Four", Price = 129.99m, StockQuantity = 40, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-006", Name = "Head First Design Patterns", Description = "Building Extensible and Maintainable Object-Oriented Software", Category = "Learn", Author = "Eric Freeman & Elisabeth Robson", Price = 79.99m, StockQuantity = 80, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-007", Name = "Structure and Interpretation of Computer Programs", Description = "Classic Computer Science Textbook", Category = "Learn", Author = "Harold Abelson & Gerald Jay Sussman", Price = 94.99m, StockQuantity = 45, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "LEARN-008", Name = "Introduction to Algorithms", Description = "Comprehensive Guide to Algorithms", Category = "Learn", Author = "Thomas H. Cormen", Price = 149.99m, StockQuantity = 35, IsActive = true, CreatedAt = now },

            // === PSYCHOLOGY ===
            new ProductEntity { Code = "PSYCH-001", Name = "Thinking, Fast and Slow", Description = "How Two Systems Drive the Way We Think", Category = "Psychology", Author = "Daniel Kahneman", Price = 69.99m, StockQuantity = 120, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-002", Name = "Atomic Habits", Description = "An Easy & Proven Way to Build Good Habits & Break Bad Ones", Category = "Psychology", Author = "James Clear", Price = 59.99m, StockQuantity = 200, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-003", Name = "The Power of Habit", Description = "Why We Do What We Do in Life and Business", Category = "Psychology", Author = "Charles Duhigg", Price = 54.99m, StockQuantity = 150, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-004", Name = "Influence: The Psychology of Persuasion", Description = "The Psychology of Persuasion", Category = "Psychology", Author = "Robert B. Cialdini", Price = 64.99m, StockQuantity = 90, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-005", Name = "Man's Search for Meaning", Description = "A Classic Holocaust Memoir", Category = "Psychology", Author = "Viktor E. Frankl", Price = 49.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-006", Name = "Emotional Intelligence", Description = "Why It Can Matter More Than IQ", Category = "Psychology", Author = "Daniel Goleman", Price = 59.99m, StockQuantity = 110, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-007", Name = "The Subtle Art of Not Giving a F*ck", Description = "A Counterintuitive Approach to Living a Good Life", Category = "Psychology", Author = "Mark Manson", Price = 52.99m, StockQuantity = 250, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "PSYCH-008", Name = "Mindset: The New Psychology of Success", Description = "How We Can Learn to Fulfill Our Potential", Category = "Psychology", Author = "Carol S. Dweck", Price = 57.99m, StockQuantity = 130, IsActive = true, CreatedAt = now },

            // === ROMANCE ===
            new ProductEntity { Code = "ROM-001", Name = "Pride and Prejudice", Description = "A Romantic Novel of Manners", Category = "Romance", Author = "Jane Austen", Price = 39.99m, StockQuantity = 200, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-002", Name = "The Notebook", Description = "A Timeless Love Story", Category = "Romance", Author = "Nicholas Sparks", Price = 44.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-003", Name = "Outlander", Description = "A Historical Romance Adventure", Category = "Romance", Author = "Diana Gabaldon", Price = 54.99m, StockQuantity = 150, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-004", Name = "Me Before You", Description = "A Heart-Wrenching Love Story", Category = "Romance", Author = "Jojo Moyes", Price = 47.99m, StockQuantity = 160, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-005", Name = "The Fault in Our Stars", Description = "A Story of Love and Loss", Category = "Romance", Author = "John Green", Price = 42.99m, StockQuantity = 220, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-006", Name = "It Ends with Us", Description = "A Brave and Heartbreaking Novel", Category = "Romance", Author = "Colleen Hoover", Price = 49.99m, StockQuantity = 300, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-007", Name = "Beach Read", Description = "A Romance Writers Romance", Category = "Romance", Author = "Emily Henry", Price = 45.99m, StockQuantity = 140, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "ROM-008", Name = "The Hating Game", Description = "An Enemies to Lovers Romance", Category = "Romance", Author = "Sally Thorne", Price = 43.99m, StockQuantity = 170, IsActive = true, CreatedAt = now },

            // === SCIENCE FICTION ===
            new ProductEntity { Code = "SF-001", Name = "Dune", Description = "The Epic Science Fiction Masterpiece", Category = "Sci-Fi", Author = "Frank Herbert", Price = 64.99m, StockQuantity = 150, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-002", Name = "Foundation", Description = "The First Novel in the Foundation Series", Category = "Sci-Fi", Author = "Isaac Asimov", Price = 54.99m, StockQuantity = 120, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-003", Name = "Neuromancer", Description = "The Classic Cyberpunk Novel", Category = "Sci-Fi", Author = "William Gibson", Price = 49.99m, StockQuantity = 100, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-004", Name = "The Martian", Description = "A Survival Story on Mars", Category = "Sci-Fi", Author = "Andy Weir", Price = 52.99m, StockQuantity = 200, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-005", Name = "Ender's Game", Description = "A Military Science Fiction Classic", Category = "Sci-Fi", Author = "Orson Scott Card", Price = 47.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-006", Name = "1984", Description = "A Dystopian Social Science Fiction", Category = "Sci-Fi", Author = "George Orwell", Price = 44.99m, StockQuantity = 250, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-007", Name = "Brave New World", Description = "A Dystopian Vision of the Future", Category = "Sci-Fi", Author = "Aldous Huxley", Price = 42.99m, StockQuantity = 190, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-008", Name = "Project Hail Mary", Description = "An Astronaut's Desperate Mission", Category = "Sci-Fi", Author = "Andy Weir", Price = 59.99m, StockQuantity = 160, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "SF-009", Name = "Snow Crash", Description = "A Cyberpunk Adventure", Category = "Sci-Fi", Author = "Neal Stephenson", Price = 51.99m, StockQuantity = 110, IsActive = true, CreatedAt = now },

            // === THRILLER / MYSTERY ===
            new ProductEntity { Code = "THRILL-001", Name = "The Girl with the Dragon Tattoo", Description = "A Gripping Thriller", Category = "Thriller", Author = "Stieg Larsson", Price = 54.99m, StockQuantity = 140, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "THRILL-002", Name = "Gone Girl", Description = "A Psychological Thriller", Category = "Thriller", Author = "Gillian Flynn", Price = 49.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "THRILL-003", Name = "The Da Vinci Code", Description = "A Mystery Thriller", Category = "Thriller", Author = "Dan Brown", Price = 52.99m, StockQuantity = 200, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "THRILL-004", Name = "The Silent Patient", Description = "A Shocking Psychological Thriller", Category = "Thriller", Author = "Alex Michaelides", Price = 47.99m, StockQuantity = 220, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "THRILL-005", Name = "Sharp Objects", Description = "A Haunting Thriller", Category = "Thriller", Author = "Gillian Flynn", Price = 45.99m, StockQuantity = 130, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "THRILL-006", Name = "The Girl on the Train", Description = "A Psychological Thriller", Category = "Thriller", Author = "Paula Hawkins", Price = 48.99m, StockQuantity = 190, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "THRILL-007", Name = "Big Little Lies", Description = "A Murder Mystery", Category = "Thriller", Author = "Liane Moriarty", Price = 46.99m, StockQuantity = 160, IsActive = true, CreatedAt = now },

            // === FANTASY ===
            new ProductEntity { Code = "FANT-001", Name = "The Lord of the Rings", Description = "The Complete Trilogy", Category = "Fantasy", Author = "J.R.R. Tolkien", Price = 89.99m, StockQuantity = 100, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-002", Name = "Harry Potter and the Sorcerer's Stone", Description = "The Beginning of the Magical Journey", Category = "Fantasy", Author = "J.K. Rowling", Price = 54.99m, StockQuantity = 300, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-003", Name = "A Game of Thrones", Description = "The First Book of Ice and Fire", Category = "Fantasy", Author = "George R.R. Martin", Price = 64.99m, StockQuantity = 150, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-004", Name = "The Name of the Wind", Description = "The Kingkiller Chronicle Day One", Category = "Fantasy", Author = "Patrick Rothfuss", Price = 59.99m, StockQuantity = 120, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-005", Name = "The Way of Kings", Description = "The Stormlight Archive Book 1", Category = "Fantasy", Author = "Brandon Sanderson", Price = 69.99m, StockQuantity = 100, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-006", Name = "The Hobbit", Description = "A Fantasy Adventure", Category = "Fantasy", Author = "J.R.R. Tolkien", Price = 44.99m, StockQuantity = 200, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-007", Name = "Mistborn: The Final Empire", Description = "The First Mistborn Novel", Category = "Fantasy", Author = "Brandon Sanderson", Price = 54.99m, StockQuantity = 140, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "FANT-008", Name = "The Chronicles of Narnia", Description = "The Complete Collection", Category = "Fantasy", Author = "C.S. Lewis", Price = 79.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },

            // === BUSINESS ===
            new ProductEntity { Code = "BUS-001", Name = "The Lean Startup", Description = "How Constant Innovation Creates Radically Successful Businesses", Category = "Business", Author = "Eric Ries", Price = 64.99m, StockQuantity = 150, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "BUS-002", Name = "Zero to One", Description = "Notes on Startups, or How to Build the Future", Category = "Business", Author = "Peter Thiel", Price = 59.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "BUS-003", Name = "Good to Great", Description = "Why Some Companies Make the Leap and Others Don't", Category = "Business", Author = "Jim Collins", Price = 69.99m, StockQuantity = 120, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "BUS-004", Name = "The 7 Habits of Highly Effective People", Description = "Powerful Lessons in Personal Change", Category = "Business", Author = "Stephen R. Covey", Price = 54.99m, StockQuantity = 200, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "BUS-005", Name = "Rich Dad Poor Dad", Description = "What the Rich Teach Their Kids About Money", Category = "Business", Author = "Robert T. Kiyosaki", Price = 49.99m, StockQuantity = 250, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "BUS-006", Name = "Think and Grow Rich", Description = "The Landmark Bestseller", Category = "Business", Author = "Napoleon Hill", Price = 44.99m, StockQuantity = 180, IsActive = true, CreatedAt = now },
            new ProductEntity { Code = "BUS-007", Name = "The 4-Hour Workweek", Description = "Escape 9-5, Live Anywhere, and Join the New Rich", Category = "Business", Author = "Timothy Ferriss", Price = 57.99m, StockQuantity = 160, IsActive = true, CreatedAt = now }
        );
    }
}
