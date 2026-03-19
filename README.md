# 🏛️ The Council — Multi-LLM Deliberation Platform

A sophisticated web application that enables collaborative decision-making by convening multiple Large Language Models (LLMs) in a structured deliberation process. The Council allows you to pose questions or problems to a panel of AI experts, each with distinct roles and perspectives, and guides them through a multi-stage process to reach a well-reasoned conclusion.

![The Council Interface](docs/interface.png)

## 🌟 Features

### Multi-Stage AI Deliberation Process
1. **Council Formation**: Assemble a diverse group of AI experts with distinct roles and perspectives
2. **Deliberation Rounds**: Each council member responds to your question in structured rounds
3. **Best-Parts Combiner**: An AI extracts the strongest insights from each response and weaves them into a superior unified answer
4. **Synthesis** *(Optional)*: Additional synthesis of the deliberation process
5. **Final Verdict**: A designated leader reviews all inputs and issues a binding final decision

### Flexible Deployment Options
- **Local Mode**: Connect to your local Ollama instance
- **Cloud Mode**: Access powerful models hosted by Ollama Cloud
- **Docker Support**: Easy containerized deployment with Docker Compose

### Advanced Capabilities
- **Model Browser**: Browse and select from a curated list of cloud models
- **Customizable Roles**: Define specific personas and expertise for each council member
- **Configurable Pipeline**: Enable/disable features and adjust settings
- **Export/Import Configurations**: Save and share council configurations
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [Ollama](https://ollama.ai/) (for local mode)
- Docker & Docker Compose (for containerized deployment)

### Option 1: Direct Execution
```bash
# Clone the repository
git clone https://github.com/PaulDanielBarnard/LLM_Council.git
cd LLM_Council

# Start the server
node server.js

# Open your browser to http://localhost:3000
```

### Option 2: Docker Deployment
```bash
# Clone the repository
git clone https://github.com/PaulDanielBarnard/LLM_Council.git
cd LLM_Council

# Start with Docker Compose (includes Ollama)
docker-compose up -d

# Access the application at http://localhost:3000
```

## 🎯 Usage Guide

### Setting Up Connection
1. **Local Mode**: Connect to your local Ollama instance (default: `http://localhost:11434`)
2. **Cloud Mode**: Enter your Ollama API key from [ollama.com/settings/api-keys](https://ollama.com/settings/api-keys)

### Building Your Council
1. **Add Members**: Click "Add Member" or select models from the Cloud Model Browser
2. **Define Roles**: Give each member a specific role/persona (e.g., "The Analyst", "The Contrarian")
3. **Configure Pipeline**:
   - Enable/disable the Best-Parts Combiner
   - Enable/disable the Final Verdict leader
   - Set number of deliberation rounds (1-3)
   - Adjust temperature for creativity vs. consistency

### Running a Deliberation
1. Enter your question in the prompt area
2. Click "Convene the Council"
3. Watch as each council member deliberates in real-time
4. Review the combined insights and final verdict

### Configuration Management
- **Save Config**: Export your council setup to a JSON file
- **Load Config**: Import a previously saved configuration

## 🛠️ Technical Architecture

### Frontend
- Pure HTML/CSS/JavaScript (no framework dependencies)
- Responsive design with modern UI components
- Real-time streaming of AI responses
- Local storage for saving connection settings

### Backend
- Lightweight Node.js proxy server
- Eliminates CORS issues when accessing Ollama APIs
- Serves static assets and handles API routing
- No external dependencies beyond Node.js built-ins

### API Proxy Routes
- `/proxy/local` → Routes to local Ollama instance
- `/proxy/cloud` → Routes to Ollama Cloud API

## 🐳 Docker Configuration

The provided `docker-compose.yml` sets up two services:
1. **council**: The web application server
2. **ollama**: Official Ollama container with persistent data volume

```yaml
services:
  council:
    build: .
    ports:
      - "3000:3000"
    command: ["node", "server.js", "--port", "3000", "--ollama", "http://ollama:11434"]
    depends_on:
      - ollama

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

## 🔧 Command Line Options

The server accepts several command line arguments:

```bash
# Custom port (default: 3000)
node server.js --port 8080

# Custom Ollama endpoint (default: http://localhost:11434)
node server.js --ollama http://192.168.1.5:11434
```

## 📁 Project Structure

```
LLM_Council/
├── ollama-council.html  # Main application interface
├── script.js           # Client-side logic and AI interaction
├── style.css           # Styling and responsive design
├── server.js           # Node.js proxy server
├── Dockerfile          # Docker configuration for the app
├── docker-compose.yml  # Multi-container setup with Ollama
├── .dockerignore       # Docker ignore rules
└── .gitignore          # Git ignore rules
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to the Ollama team for making powerful LLMs accessible locally
- Inspired by deliberative democracy and collective intelligence principles
- Built with modern web technologies and thoughtful design

## 📞 Support

For support, please open an issue on the GitHub repository or contact the maintainer.

---

*The Council transforms isolated AI responses into collaborative intelligence through structured deliberation.*