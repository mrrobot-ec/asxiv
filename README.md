# asXiv

> An intelligent AI-powered interface for exploring and understanding arXiv research papers

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**

   ```bash
   git clone git@github.com:montanaflynn/asxiv.git
   cd asxiv
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Add your Gemini API key to `.env.local`:

   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open the website**

   Visit the homepage at [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional
GEMINI_MODEL=gemini-2.5-flash-lite
```

**Available Gemini Models:**
- `gemini-2.5-flash-lite` - Fastest, lowest cost (default)
- `gemini-2.5-flash` - Balanced speed and performance  
- `gemini-2.5-pro` - Highest quality, slower, more expensive

## Development

### Project Structure
```
src/
├── components/
│   ├── ChatWidget.tsx     # Main chat interface
│   └── ChatWidget.module.css
├── pages/
│   ├── api/
│   │   └── chat.ts        # Gemini API integration
│   ├── pdf/
│   │   └── [...arxivId].tsx  # Dynamic PDF viewer pages (supports ArXiv IDs with forward slashes)
│   └── index.tsx          # Homepage
└── styles/
    └── globals.css        # Global styles
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features
1. PDF processing enhancements in `/api/chat.ts`
2. UI improvements in `ChatWidget.tsx`
3. Styling updates in CSS modules
4. New page types in `/pages/pdf/`

### Page Reference Format
The AI uses a standardized format for page references: `(page N)` where N is the page number. These are automatically converted to clickable links that navigate the PDF viewer. This simple format avoids complex regex parsing while maintaining clean functionality.

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [arXiv](https://arxiv.org/) for providing open access to research papers
- [Google Gemini](https://ai.google.dev/) for powerful AI capabilities
- [PDF.js](https://mozilla.github.io/pdf.js/) for excellent PDF rendering
- [Next.js](https://nextjs.org/) for the amazing React framework

---

<div align="center">
  <strong>Built with ❤️ for the research community</strong>
  <br>
  <sub>Making academic papers more accessible through AI</sub>
</div>
