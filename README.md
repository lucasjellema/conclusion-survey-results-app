# Cloud Survey Results Application

A secure, cloud-based survey results application with Microsoft Entra ID (Azure AD) authentication. This application allows organizations to report results of sophisticated surveys with various question types.

## Features

- **Diverse Question Types**: Support for multiple question formats including text, radio, checkbox, Likert scales, ranking, and more
- **Microsoft Entra ID Authentication**: Secure user authentication via MSAL.js
- **Responsive Design**: Clean UI that works across devices
- **Advanced Question Rendering**: Specialized renderers for complex question types
- **Rich Text Support**: Enhanced text input with formatting options
- **Comment Fields**: Optional comment capability for any question type
- **Data Persistence**: Secure saving of survey responses with authentication
- **Modular Architecture**: Well-organized ES Modules structure for maintainability


## Local Development Setup

To set up the project for local development, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/cloud-survey-results-app.git
    cd cloud-survey-results-app
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Authentication**:
    *   Update `js/authConfig.js` with your Microsoft Entra ID (Azure AD) application details.
    *   Ensure your redirect URIs are correctly configured in your Azure AD application registration.
4.  **Run the application**:
    ```bash
    npm start
    ```
    This will typically start a local server, and you can access the application in your browser at `http://localhost:3000` (or the port specified in your configuration).

## External Data

The Survey Definition is fetched from the local file indicated by surveyDefinitionFile in resultsDataService.js.

The Survey Results are fetched from surveySummaryEndpoint defined in dataConfig.js

## License

This project is available for use under the MIT License.
