<<<<<<< HEAD
# ⚡ ThermoSpark — Battery Thermal Runaway Identifier 🌡️

> **Real-time IoT Dashboard for early detection and isolation of battery thermal events.**

Built with ❤️ by **Team IGNOVATORS** for the **ThermoSpark Hackathon 2026** at VVCE, Mysuru.

---

## 🚀 Overview
**ThermoSpark** is a high-performance, real-time monitoring system designed to prevent catastrophic battery failures. By monitoring temperature and electrolyte vapor levels, it detects the early stages of **Thermal Runaway** before it becomes irreversible.

### ✨ Key Features
- 📊 **Real-time Gauges**: Live visualization of Battery Temperature and Electrolyte Vapors (PPM).
- ⚡ **Kill Switch Logic**: Automated load isolation using a high-speed **IRLZ44N MOSFET** (isolation in <1ms).
- 🧪 **Gas Detection**: MQ-2 sensor integration for early chemical venting detection.
- 🔌 **Hardware Link**: Seamless connection via the **WebSerial API**.
- 💻 **Live Console**: Raw data stream for debugging and telemetry.

---

## 🛠️ System Architecture
The system consists of a hardware sensing layer and a web-based visualization layer.

- **Microcontroller**: Arduino UNO / ESP32
- **Sensors**: 
  - 🌡️ **LM35 / Thermistor**: Thermal monitoring.
  - 💨 **MQ-2**: Gas/Vapor detection.
- **Actuator**: ⚡ **IRLZ44N N-Channel MOSFET** for high-speed isolation.
- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript.
- **Communication**: WebSerial API (9600 Baud).

---

## 💻 Tech Stack
- **Languages**: HTML5, CSS3, JavaScript (ES6+)
- **Design**: Cyber-Industrial UI with Glassmorphism and Particle Effects.
- **Protocol**: WebSerial API.

---

## 🛠️ Setup & Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/AniruddhaMJois/battery-thermal-runaway-identifier.git
    ```
2.  **Open the dashboard**:
    Simply open `index.html` in any modern browser (Chrome/Edge recommended for WebSerial support).
3.  **Hardware Connection**:
    - Connect your Arduino with the sensors.
    - Upload the firmware (if available).
    - Click **"Connect to ThermoSpark Hardware"** on the dashboard.

---

## 👨‍💻 Team IGNOVATORS
- **College**: Vidya Vardhaka College of Engineering (VVCE), Mysuru.
- **Event**: ThermoSpark Hackathon 2026.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Stay Safe. Stay Charged. ⚡*
=======
# battery-thermal-runaway-identifier
>>>>>>> 97e050534bd85713e809e1ccfffcb0fe3673185a
