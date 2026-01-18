# TODO

## LLM Documentation: Code Patterns and Design Decisions

**Status:** In Progress
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Create documentation explaining code patterns, design decisions, and architectural choices used throughout the codebase.

### Requirements
- Factory function pattern in sqlUtils.ts (why used)
- Promise-based async query handling (why Promises)
- Recursive tree traversal algorithm (design choice)
- File system operations (synchronous vs async choice)
- Type casting in SQL results (why needed)
- Module organization decisions
- Error handling approach
- Trade-offs and alternatives considered

### Deliverables
- Section in `__docs/architecture.md` or separate `__docs/patterns.md`
- Explain "why" not just "what"
- Document design decisions and trade-offs
- Reference specific code locations

### Notes
- Partial: Code Organization Patterns section exists in architecture.md but needs expansion with "why" explanations and trade-offs analysis

---

## LLM Documentation: Database Schema and SQL Queries

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 45-60 minutes

### Description
Create `__docs/database.md` documenting the Gallery 2 database schema, table relationships, SQL query construction, and data extraction patterns.

### Requirements
- Gallery 2 database schema understanding
- All tables involved (ChildEntity, Entity, Item, FileSystemEntity, PhotoItem, DerivativeImage)
- Table relationships and JOIN logic explanation
- SQL query construction and parameterization
- Column and table prefix handling mechanism
- How prefixes are used in query building
- Data extraction patterns and what data is retrieved
- Explain each JOIN and why it's needed
- Document the WHERE clause filtering logic

### Deliverables
- `__docs/database.md` with comprehensive database documentation
- Include the actual SQL query with explanations
- Reference sqlUtils.ts lines 7-46
- Explain Gallery 2 schema structure

---

## LLM Documentation: Configuration System

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Create `__docs/configuration.md` documenting the configuration file structure, all settings, validation, and usage patterns.

### Requirements
- Configuration file structure and schema (config.json)
- MySQL connection settings (host, user, password, database)
- Gallery settings (tablePrefix, columnPrefix)
- Optional settings (ignoreAlbums, onlyAlbums, thumbPrefix)
- Configuration validation and defaults
- How configuration is loaded and used
- Environment-specific considerations
- Example configuration with explanations

### Deliverables
- `__docs/configuration.md` with configuration documentation
- Reference config_example.json
- Reference types.ts Config interface
- Explain each configuration option and its purpose

---

## LLM Documentation: Recursive Algorithm and Data Flow

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 45-60 minutes

### Description
Create `__docs/data-flow.md` documenting the recursive traversal algorithm, data processing logic, path construction, and JSON file generation.

### Requirements
- Recursive traversal algorithm explanation (main function)
- How the algorithm traverses the album tree
- Album hierarchy processing
- Photo item identification logic
- Path component concatenation logic (why different for photos vs albums)
- JSON file generation format and structure
- How files are organized by album ID
- The relationship between hasChildren flag and recursion
- Depth parameter usage (current and potential)
- Hardcoded root ID (7) explanation
- Data transformation from database to JSON

### Deliverables
- `__docs/data-flow.md` with data flow documentation
- Include step-by-step algorithm walkthrough
- Reference index.ts lines 11-24
- Include data flow diagrams in markdown format
- Explain edge cases and gotchas

---

## LLM Documentation: API Reference - sqlUtils Module

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Create API reference documentation for the sqlUtils module, documenting the factory function pattern, getChildren function, and query handling.

### Requirements
- Factory function pattern explanation
- sqlUtils function signature and parameters
- getChildren function API
- Promise-based async query handling
- Error handling in queries
- Return type and structure
- Usage examples
- How the module is instantiated and used

### Deliverables
- Section in `__docs/api-reference.md` for sqlUtils module
- Reference sqlUtils.ts with specific line numbers
- Include code examples
- Document function parameters and return values

---

## LLM Documentation: API Reference - Main Function

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Create API reference documentation for the main function in index.ts, documenting the recursive traversal, file operations, and execution flow.

### Requirements
- Main function signature and parameters
- Recursive traversal logic
- File system operations (writeFileSync)
- How the function is called (main(7))
- Execution flow from start to finish
- Side effects (file writing)
- Usage examples

### Deliverables
- Section in `__docs/api-reference.md` for main function
- Reference index.ts with specific line numbers
- Include code examples
- Document function parameters and behavior

---

## LLM Documentation: Error Handling and Edge Cases

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Document error handling patterns, edge cases, potential failure points, and how the system handles various scenarios.

### Requirements
- Error handling in SQL queries
- What happens on database connection failure
- Handling of empty results
- Edge cases in recursive traversal
- File system error handling
- Null/undefined value handling
- Missing configuration scenarios
- Invalid data scenarios
- Potential bugs or issues to be aware of

### Deliverables
- Section in `__docs/api-reference.md` or separate `__docs/error-handling.md`
- Document all error scenarios
- Explain edge cases and gotchas
- Reference code locations where errors can occur

---

## LLM Documentation: Cross-References and Navigation

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Create navigation document and ensure all documentation files are cross-referenced with links to related concepts and code locations.

### Requirements
- Create `__docs/README.md` or `__docs/index.md` as navigation hub
- Link related concepts across documents
- Reference actual code locations with file paths and line numbers
- Create table of contents for all documentation
- Ensure consistency across all docs
- Verify all code references are accurate

### Deliverables
- `__docs/README.md` or `__docs/index.md` with navigation
- Cross-reference links in all documentation files
- Table of contents
- Quick reference guide

---

## LLM Documentation: Quick Reference and Code Examples

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 30-45 minutes

### Description
Create a quick reference guide with common code examples, usage patterns, and frequently needed information for LLM agents.

### Requirements
- Common code examples
- Usage patterns
- Quick lookup for function signatures
- Common operations (how to query children, how to traverse)
- Configuration examples
- Data structure examples
- Frequently asked questions

### Deliverables
- `__docs/quick-reference.md` or section in index
- Code examples for common operations
- Quick lookup tables
- FAQ section

---

## Modern Web UI Gallery Conversion

**Status:** Pending
**Priority:** High
**Complexity:** High
**Estimated Time:** 40-60 hours

### Description
Convert the existing TypeScript static HTML generator (which was converted from an ancient Python version) into a modern, interactive web application for viewing images in a gallery format. The current implementation generates static JSON files from a Gallery 2 database, but the result is not visually appealing and difficult to work with.

### Requirements

#### Core Functionality
- Replace static HTML generation with a dynamic, single-page application (SPA)
- Implement modern gallery UI with responsive design
- Support dynamic loading of images and albums
- Maintain compatibility with existing Gallery 2 database structure and JSON data format
- Preserve existing data extraction logic (sqlUtils.ts) for database queries

#### Modern Web Features
- **Theming System:**
  - Support for multiple themes (light, dark, custom)
  - Theme switching without page reload
  - Persistent theme preferences (localStorage)
  - CSS variables for easy theme customization

- **Dynamic Loading:**
  - Lazy loading of images
  - Progressive image loading (thumbnails → full resolution)
  - Infinite scroll or pagination for large galleries
  - On-demand album loading
  - Virtual scrolling for performance with large datasets

- **Modern Gallery Features:**
  - Grid and list view modes
  - Lightbox/modal for full-screen image viewing
  - Image zoom and pan capabilities
  - Keyboard navigation (arrow keys, escape)
  - Touch/swipe gestures for mobile
  - Image metadata display (title, description, dimensions, timestamp)
  - Breadcrumb navigation for album hierarchy
  - Search/filter functionality
  - Sorting options (date, name, size)

#### Technical Requirements
- Use modern frontend framework (React, Vue, or vanilla TypeScript with modern patterns)
- TypeScript for type safety
- Modern build tooling (Vite, Webpack, or similar)
- Responsive CSS (mobile-first approach)
- Accessibility features (ARIA labels, keyboard navigation, screen reader support)
- Performance optimizations (image optimization, code splitting, caching)
- Browser compatibility (modern browsers, graceful degradation)

#### Architecture Considerations
- Separate frontend application from data extraction logic
- API layer for serving JSON data (or direct file serving if static)
- Component-based architecture
- State management for gallery data and UI state
- Routing for deep linking to specific albums/images
- Error handling and loading states

### Implementation Phases

#### Phase 1: Project Setup & Architecture
- Choose frontend framework and tooling
- Set up build configuration
- Create project structure
- Set up development environment
- Configure TypeScript for frontend

#### Phase 2: Core Gallery Components
- Album list/grid component
- Image thumbnail component
- Album detail view
- Image lightbox/modal component
- Navigation components (breadcrumbs, back button)

#### Phase 3: Data Integration
- Integrate with existing JSON data structure
- Create data fetching/loading utilities
- Implement routing for albums and images
- Handle nested album structures

#### Phase 4: Theming System
- Design theme structure
- Implement CSS variable system
- Create theme switching UI
- Add theme persistence

#### Phase 5: Dynamic Loading & Performance
- Implement lazy loading
- Add progressive image loading
- Optimize image delivery
- Implement virtual scrolling or pagination
- Add caching strategies

#### Phase 6: Advanced Features
- Search and filter
- Sorting options
- View mode switching
- Keyboard navigation
- Touch gestures
- Image zoom/pan

#### Phase 7: Polish & Optimization
- Accessibility improvements
- Performance optimization
- Cross-browser testing
- Mobile responsiveness
- Error handling
- Loading states

### Technical Notes
- Current codebase uses Node.js with TypeScript
- Data is extracted from MySQL Gallery 2 database
- JSON files are written to `./data/` directory
- Existing types defined in `types.ts` should be extended for frontend use
- Consider maintaining backward compatibility with existing data format

### Dependencies to Add
- Frontend framework (React/Vue/Svelte or vanilla TS)
- Build tool (Vite/Webpack)
- CSS framework or utility library (optional)
- Image optimization library
- Routing library (if using SPA framework)
- State management (if needed)

### Testing Requirements
- Unit tests for components
- Integration tests for data flow
- E2E tests for user interactions
- Performance testing with large datasets
- Cross-browser testing
- Mobile device testing
