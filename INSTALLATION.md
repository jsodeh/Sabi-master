# Sabi Learning Companion - Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 2 GB available space
- **Internet**: Broadband connection required for AI features
- **Browser**: Chrome/Chromium 90+ (automatically managed)

### Recommended Requirements
- **RAM**: 16 GB for optimal performance
- **Storage**: 5 GB available space
- **CPU**: Multi-core processor (4+ cores recommended)
- **Graphics**: Dedicated GPU for better performance (optional)

## Installation Methods

### Method 1: Download Pre-built Installer (Recommended)

#### Windows
1. Download the latest `Sabi-Learning-Companion-Setup-x.x.x.exe` from the [releases page](https://github.com/sabi-team/sabi-learning-companion/releases)
2. Run the installer as Administrator
3. Follow the installation wizard
4. Launch Sabi from the Start Menu or Desktop shortcut

#### macOS
1. Download the latest `Sabi-Learning-Companion-x.x.x.dmg` from the [releases page](https://github.com/sabi-team/sabi-learning-companion/releases)
2. Open the DMG file
3. Drag Sabi to your Applications folder
4. Launch Sabi from Applications (you may need to allow it in Security & Privacy settings)

#### Linux
1. Download the appropriate package for your distribution:
   - **Ubuntu/Debian**: `sabi-learning-companion_x.x.x_amd64.deb`
   - **Red Hat/Fedora**: `sabi-learning-companion-x.x.x.x86_64.rpm`
   - **AppImage**: `Sabi-Learning-Companion-x.x.x.AppImage`

2. Install using your package manager:
   ```bash
   # Ubuntu/Debian
   sudo dpkg -i sabi-learning-companion_x.x.x_amd64.deb
   sudo apt-get install -f  # Fix dependencies if needed
   
   # Red Hat/Fedora
   sudo rpm -i sabi-learning-companion-x.x.x.x86_64.rpm
   
   # AppImage (no installation required)
   chmod +x Sabi-Learning-Companion-x.x.x.AppImage
   ./Sabi-Learning-Companion-x.x.x.AppImage
   ```

### Method 2: Build from Source

#### Prerequisites
- Node.js 18+ and npm
- Git
- Python 3.8+ (for native dependencies)
- Build tools for your platform:
  - **Windows**: Visual Studio Build Tools or Visual Studio Community
  - **macOS**: Xcode Command Line Tools
  - **Linux**: build-essential package

#### Build Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/sabi-team/sabi-learning-companion.git
   cd sabi-learning-companion
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Create distribution packages:
   ```bash
   # For current platform
   npm run dist
   
   # For specific platforms
   npm run dist:win    # Windows
   npm run dist:mac    # macOS
   npm run dist:linux  # Linux
   ```

5. Find the built packages in the `release` directory

## First-Time Setup

### 1. Initial Configuration
When you first launch Sabi, you'll be guided through the setup process:

1. **Welcome Screen**: Introduction to Sabi's capabilities
2. **Privacy Settings**: Configure data usage and privacy preferences
3. **Learning Preferences**: Set your learning style and pace
4. **Tool Connections**: Connect to your preferred AI building tools
5. **Voice Setup**: Configure voice input (optional)

### 2. Tool Integration Setup

Sabi works with various AI building tools. You'll need accounts for:

- **Builder.io**: For visual website building
- **Firebase Studio**: For backend services
- **Lovable**: For AI-powered development
- **Bolt.new**: For rapid prototyping
- **Replit**: For collaborative coding

During setup, you can:
- Connect existing accounts
- Create new accounts with guided assistance
- Skip tools you don't plan to use

### 3. Performance Optimization

For optimal performance:

1. **Memory Settings**: Adjust cache sizes based on your system RAM
2. **Network Settings**: Configure proxy settings if needed
3. **Browser Settings**: Choose browser preferences for automation
4. **Update Settings**: Configure automatic update preferences

## Troubleshooting

### Common Installation Issues

#### Windows
- **"Windows protected your PC"**: Click "More info" → "Run anyway"
- **Installation fails**: Run installer as Administrator
- **Antivirus blocking**: Add Sabi to antivirus exceptions

#### macOS
- **"App can't be opened"**: Go to System Preferences → Security & Privacy → Allow
- **Gatekeeper issues**: Run `sudo xattr -rd com.apple.quarantine /Applications/Sabi.app`
- **Permission issues**: Grant necessary permissions in System Preferences

#### Linux
- **Missing dependencies**: Install using your package manager
- **AppImage won't run**: Make sure it's executable (`chmod +x`)
- **Desktop integration**: Use AppImageLauncher for better integration

### Performance Issues

#### High Memory Usage
1. Reduce cache sizes in Settings → Performance
2. Close unused browser tabs in Sabi
3. Restart Sabi periodically during long sessions

#### Slow Response Times
1. Check internet connection
2. Clear AI response cache
3. Reduce concurrent learning sessions
4. Update to latest version

#### Browser Automation Issues
1. Ensure Chrome/Chromium is up to date
2. Check firewall settings
3. Disable conflicting browser extensions
4. Reset browser automation settings

## Updates

### Automatic Updates
Sabi includes an automatic update system:

1. **Check for Updates**: Automatically checks every 4 hours
2. **Download**: Updates download in the background
3. **Install**: Prompts to restart when ready
4. **Rollback**: Previous version backup for safety

### Manual Updates
To manually check for updates:
1. Go to Settings → About
2. Click "Check for Updates"
3. Follow the update prompts

### Update Settings
Configure update behavior:
- **Auto-check**: Enable/disable automatic checking
- **Auto-download**: Download updates automatically
- **Auto-install**: Install on app restart
- **Pre-release**: Include beta versions

## Uninstallation

### Windows
1. Use "Add or Remove Programs" in Windows Settings
2. Or run the uninstaller from the installation directory
3. Remove user data from `%APPDATA%\sabi` if desired

### macOS
1. Drag Sabi from Applications to Trash
2. Remove user data from `~/Library/Application Support/sabi` if desired

### Linux
```bash
# Ubuntu/Debian
sudo apt remove sabi-learning-companion

# Red Hat/Fedora
sudo rpm -e sabi-learning-companion

# AppImage
Simply delete the AppImage file
```

## Support

### Getting Help
- **Documentation**: [docs.sabi.ai](https://docs.sabi.ai)
- **Community Forum**: [community.sabi.ai](https://community.sabi.ai)
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/sabi-team/sabi-learning-companion/issues)
- **Email Support**: support@sabi.ai

### System Information
When reporting issues, include:
- Sabi version (Help → About)
- Operating system and version
- System specifications (RAM, CPU)
- Error messages or logs
- Steps to reproduce the issue

### Log Files
Find log files at:
- **Windows**: `%APPDATA%\sabi\logs`
- **macOS**: `~/Library/Logs/sabi`
- **Linux**: `~/.config/sabi/logs`

## Privacy and Security

### Data Collection
Sabi collects minimal data to function:
- Learning progress and preferences
- Performance metrics (anonymous)
- Crash reports (optional)
- Usage analytics (optional)

### Data Storage
- Local storage for user data
- Encrypted sensitive information
- No personal data sent to servers without consent

### Security Features
- Sandboxed browser automation
- Secure credential storage
- Regular security updates
- Privacy-first design

For detailed privacy information, see our [Privacy Policy](https://sabi.ai/privacy).