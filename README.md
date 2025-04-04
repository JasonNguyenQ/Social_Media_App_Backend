# Social Media App (Backend)
Backend API for Social Media App. For frontend setup and demo video, please refer to the [Social Media App Frontend](https://github.com/JasonNguyenQ/Social_Media_App_Frontend)

## Table of Contents

[Prerequisites](#prerequisites)

[Installation](#installation)

[Usage](#usage)

[Contact](#contact)

## Prerequisites

You may have a version that differs from the ones below. If you do, please ensure that they work properly.
* npm (version 10.8.1)
* Redis (version 7.0.15)
* MySQL

## Installation

Please follow the steps below in order to set up the project locally on your machine
1. In Vscode terminal or your preferred code editor, clone the repository <br/>```git clone https://github.com/JasonNguyenQ/Social_Media_App_Backend.git```
2. Change your directory to the folder that has been cloned <br/> ```cd .\Social_Media_App_Backend\```
3. Install node dependencies and packages <br/> ```npm i``` or ```npm install```
4. Create an .env file with .env.example as a reference <br/> ```cp .env.example .env```
5. In your MySQL workbench setup the proper tables and relations as listed in the .env.example file
6. If you decide to change your port or domain from the default localhost, please ensure that the cors options accurately reflect those changes in the server.js file

## Usage

Please follow the steps below to start running the server to listen to API requests
1. Run your redis server using linux terminal <br/> ```redis-server``` <br/> If you are on Windows use the Windows Subsystem for Linux (WSL) and run the same command
2. Start listening for API requests <br/> ```npm run dev```

## Contact

Feel free to contact me @ [jason_nguyen14@yahoo.com](mailto:jason_nguyen14@yahoo.com) if you have any questions and/or concerns.


