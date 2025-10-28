# Sabi - AI-Powered Learning Companion

**Sabi** is an intelligent desktop application that transforms how you learn by providing personalized, multimodal AI assistance directly integrated into your workflow. Built with Electron and TypeScript, Sabi combines advanced AI processing, browser automation, and adaptive learning to create a seamless educational experience that guides you from initial concepts to production-ready implementations.

## 🌟 Overview

Sabi is designed to be your personal learning assistant that understands your goals, adapts to your learning style, and provides contextual guidance across multiple input modalities. Whether you're learning to code, exploring new technologies, or working on complex projects, Sabi provides intelligent support tailored to your needs without requiring you to write code.

### Key Features

- **🤖 Multimodal AI Processing**: Support for text, voice, and image inputs with intelligent intent analysis
- **🎯 Adaptive Learning Paths**: Personalized learning experiences that adapt to your skill level and progress
- **🌐 Browser Automation**: Seamless integration with web-based AI building tools using Playwright and browser-use
- **📊 Progress Analytics**: Comprehensive tracking and visualization of your learning journey
- **🔄 Real-time Feedback**: Instant guidance and corrections as you work
- **📚 Documentation Management**: Intelligent organization and retrieval of learning materials
- **🎨 Modern UI**: Clean, intuitive interface with overlay capabilities and contextual guidance
- **⚡ Performance Monitoring**: Built-in caching, metrics collection, and auto-updater system

## 🏗️ Architecture

### Core Components

#### Main Application (Electron)
- **Learning Orchestrator**: Central coordination of all learning activities with event-driven architecture
- **Multimodal Processor**: Handles text, speech, and image inputs with AI analysis
- **Browser Controller**: Automated web interaction using Playwright for seamless tool navigation
- **Session Manager**: Manages learning sessions with progress tracking and state persistence
- **Analytics Engine**: Comprehensive learning analytics and performance insights

#### AI Processing Pipeline
- **Intent Analyzer**: Understands user goals and learning objectives from natural language
- **Learning Path Generator**: Creates personalized learning sequences based on objectives and skill level
- **Adaptive Instructor**: Provides contextual guidance and adapts teaching style based on progress
- **Speech Processor**: Voice input processing with speech-to-text conversion
- **Image Processor**: Visual content analysis and understanding for multimodal learning

#### Browser Integration
- **Tool Navigator**: Intelligent navigation of web-based AI building tools (Builder.io, Firebase Studio, Lovable, Bolt.new, Replit)
- **Action Recorder**: Records and explains user interactions for learning reinforcement
- **Action Explainer**: Provides real-time context and explanations for automated actions
- **Error Recovery**: Graceful handling of browser automation failures with alternative approaches

### Companion Projects

#### Web Interface (`sabi-web/`)
- Next.js-based web interface for remote access and mobile learning
- Real-time synchronization with desktop application
- Responsive design with Tailwind CSS for learning on-the-go

#### Backend API (`sabi-backend/`)
- Express.js server for data synchronization and cloud features
- RESTful API for cross-platform integration
- User session management and progress synchronization

#### Browser Extension (`sabi-extension/`)
- Chrome extension for enhanced web integration
- Context-aware assistance while browsing learning resources
- Seamless data collection and analysis integration

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Python** (3.8+ for native dependencies)
- **Build tools** for your platform (see INSTALLATION.md for details)

### Quick Installation

1. **Download Pre-built Installer** (Recommended)
   - Visit the [releases page](https://github.com/sabi-team/sabi-learning-companion/releases)
   - Download the installer for your platform (Windows, macOS, or Linux)
   - Run the installer and follow the setup wizard

2. **Build from Source**
   ```bash
   git clone https://github.com/jsodeh/Sabi-master.git
   cd Sabi-master
   npm install
   npm run build
   npm start
   ```

### Development Setup

1. **Install development dependencies**
   ```bash
   npm install --dev
   ```

2. **Run in development mode**
   ```bash
   npm run dev
   ```

3. **Run tests**
   ```bash
   npm test
   ```

### Building for Production

**Build for all platforms:**
```bash
npm run dist
```

**Platform-specific builds:**
```bash
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

## 🎯 Usage

### First Launch

1. **Initialize Learning Profile**: Set up your learning preferences and skill levels
2. **Configure AI Services**: Connect your preferred AI providers (OpenAI, Google Cloud, Anthropic)
3. **Browser Integration**: Allow Sabi to integrate with your web browsers for automation
4. **Tool Connections**: Connect to AI building tools (Builder.io, Firebase Studio, Lovable, Bolt.new, Replit)
5. **Start Learning**: Begin with a simple objective to explore Sabi's capabilities

### Core Workflows

#### Text-Based Learning
```javascript
// Example: Learning web development
"I want to learn React hooks and build a todo app"
```

#### Voice Input
```javascript
// Activate voice mode and speak your learning objective
"Help me understand async/await in JavaScript"
```

#### Visual Learning
```javascript
// Upload screenshots or images for analysis
// Sabi will analyze UI elements and provide guidance
```

### Advanced Features

#### Custom Learning Paths
- Create personalized learning sequences with adaptive difficulty
- Set skill level targets and learning milestones
- Track progress across multiple topics and technologies

#### Browser Automation
- Automated setup of development environments
- Guided tutorials with real-time interaction and explanation
- Code deployment and testing workflows with step-by-step guidance

#### Analytics Dashboard
- Learning velocity and progress metrics with visual charts
- Skill development visualization and competency tracking
- Personalized recommendations based on learning patterns

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# AI Service Configuration
OPENAI_API_KEY=your_openai_key
GOOGLE_CLOUD_KEY=your_google_cloud_key
ANTHROPIC_API_KEY=your_anthropic_key

# Application Settings
ENVIRONMENT=development
LOG_LEVEL=info
AUTO_UPDATE=true

# Browser Automation
HEADLESS_BROWSER=false
BROWSER_TIMEOUT=30000

# Performance Settings
CACHE_SIZE_MB=512
MAX_CONCURRENT_SESSIONS=3
```

### User Preferences

Sabi stores user preferences and learning data in:
- **macOS**: `~/Library/Application Support/Sabi/`
- **Windows**: `%APPDATA%/Sabi/`
- **Linux**: `~/.config/Sabi/`

## 🧪 Testing

### Test Suite Structure

```
src/
├── __tests__/
│   ├── integration/     # Integration tests
│   └── e2e/            # End-to-end tests
├── ai/__tests__/       # AI component tests
├── browser/__tests__/  # Browser automation tests
└── core/__tests__/     # Core system tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
Sabi-master/
├── .kiro/                    # Project specifications and documentation
│   └── specs/sabi/
│       ├── requirements.md   # Detailed requirements
│       ├── design.md        # System design document
│       └── tasks.md         # Implementation tasks
├── src/                     # Main application source
│   ├── main.ts             # Electron main process entry point
│   ├── core/               # Core system components
│   │   ├── LearningOrchestrator.ts    # Central learning coordinator
│   │   ├── LearningSessionManager.ts  # Session management
│   │   ├── WindowManager.ts           # Window and overlay management
│   │   ├── PerformanceMonitor.ts      # Performance monitoring
│   │   ├── CacheManager.ts            # Caching system
│   │   ├── AutoUpdater.ts             # Auto-update functionality
│   │   └── preload.ts                 # Secure IPC bridge
│   ├── ai/                 # AI processing components
│   │   ├── MultimodalProcessor.ts     # Text, voice, image processing
│   │   ├── IntentAnalyzer.ts          # Learning intent analysis
│   │   ├── LearningPathGenerator.ts   # Adaptive path creation
│   │   ├── AdaptiveInstructor.ts      # Personalized instruction
│   │   └── processors/               # Specialized processors
│   ├── browser/            # Browser automation
│   │   ├── BrowserController.ts       # Playwright integration
│   │   ├── ToolNavigator.ts          # AI tool navigation
│   │   ├── ActionRecorder.ts         # Action recording
│   │   └── ActionExplainer.ts        # Real-time explanations
│   ├── renderer/           # Frontend UI components
│   │   ├── index.html               # Main UI
│   │   ├── main.js                  # Renderer process logic
│   │   └── components/              # UI components
│   ├── types/              # TypeScript type definitions
│   │   ├── learning.ts              # Learning system types
│   │   ├── ai.ts                    # AI processing types
│   │   ├── browser.ts               # Browser automation types
│   │   └── documentation.ts         # Documentation types
│   └── utils/              # Utility functions
├── sabi-web/               # Next.js web interface
├── sabi-backend/           # Express.js backend API
├── sabi-extension/         # Chrome browser extension
├── assets/                 # Application assets and icons
├── dist/                   # Compiled output
└── INSTALLATION.md         # Detailed installation guide
```

## 🔌 API Reference

### Core APIs

#### Learning Orchestrator
```typescript
interface LearningRequest {
  id: string;
  userId: string;
  objective: string;
  inputType: 'text' | 'voice' | 'image';
  context?: LearningContext;
}

interface LearningResponse {
  sessionId: string;
  learningPath: LearningStep[];
  estimatedDuration: number;
  recommendations: string[];
}
```

#### Multimodal Processing
```typescript
interface ProcessedInput {
  processedText: string;
  intent: LearningIntent;
  confidence: number;
  suggestions: string[];
}
```

#### Browser Automation
```typescript
interface BrowserAction {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'highlight';
  target: ElementSelector;
  value?: string;
  explanation: string;
  reasoning: string;
  expectedResult: string;
}
```

### IPC Communication

Sabi uses Electron's IPC for secure communication between processes:

```typescript
// Renderer to Main
window.sabiAPI.learning.startSession(request)
window.sabiAPI.learning.pauseSession(sessionId)
window.sabiAPI.learning.resumeSession(sessionId)
window.sabiAPI.learning.stopSession(sessionId)
window.sabiAPI.learning.submitInput(input)
window.sabiAPI.learning.getSessionStatus(sessionId)

// Main to Renderer (events)
window.sabiAPI.learning.onSessionUpdate(callback)
window.sabiAPI.learning.onStepComplete(callback)
window.sabiAPI.performance.onMetricsUpdate(callback)
window.sabiAPI.updater.onUpdateAvailable(callback)
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests for new functionality**
5. **Run the test suite**
   ```bash
   npm test
   ```
6. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
7. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Style

- **TypeScript**: Strict mode enabled with comprehensive type definitions
- **ESLint**: Configured for TypeScript and Electron best practices
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Use conventional commit messages

### Testing Guidelines

- Write unit tests for all new functions and classes
- Add integration tests for new features and workflows
- Ensure E2E tests cover critical user workflows
- Maintain test coverage above 80%

## 🐛 Troubleshooting

### Common Issues

#### App Stuck on Initialization Screen
```bash
# Check console for errors
# Open Developer Tools: Cmd+Alt+I (Mac) or F12
# Look for JavaScript errors in Console tab
```

#### Browser Automation Not Working
```bash
# Ensure Playwright browsers are installed
npx playwright install

# Check browser permissions
# Verify system accessibility permissions (macOS)
```

#### AI Services Not Responding
```bash
# Verify API keys in .env file
# Check network connectivity
# Review rate limiting and quotas
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=sabi:* npm start
```

### Log Files

Application logs are stored in:
- **macOS**: `~/Library/Logs/Sabi/`
- **Windows**: `%USERPROFILE%/AppData/Roaming/Sabi/logs/`
- **Linux**: `~/.config/Sabi/logs/`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron Team** - For the excellent desktop application framework
- **Playwright Team** - For robust browser automation capabilities
- **OpenAI** - For advanced language model APIs
- **Google Cloud** - For speech and vision processing services
- **Anthropic** - For Claude AI integration
- **TypeScript Team** - For type-safe JavaScript development

## 📞 Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/jsodeh/Sabi-master/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jsodeh/Sabi-master/discussions)
- **Email**: support@sabi-learning.com

## 🗺️ Roadmap

### Current Status (v1.0)
- ✅ Core Electron application with TypeScript
- ✅ Multimodal AI processing (text, voice, image)
- ✅ Browser automation with Playwright integration
- ✅ Learning session management and orchestration
- ✅ Real-time progress tracking and analytics
- ✅ Performance monitoring and caching
- ✅ Auto-updater system
- ✅ Comprehensive IPC integration

### Version 1.1 (Q2 2024)
- [ ] Enhanced voice processing with multiple language support
- [ ] Advanced analytics dashboard with ML insights
- [ ] Plugin system for third-party integrations
- [ ] Mobile companion app

### Version 1.2 (Q3 2024)
- [ ] Collaborative learning features
- [ ] Advanced project templates
- [ ] Integration with popular IDEs
- [ ] Cloud synchronization

### Version 2.0 (Q4 2024)
- [ ] Multi-user support
- [ ] Enterprise features
- [ ] Advanced AI model fine-tuning
- [ ] Comprehensive API for developers

---

**Built with ❤️ by the Sabi Team**

*Empowering learners through intelligent, adaptive technology.*