#!/bin/bash

function setup_server {
    if [ -d "youtube-search" ]; then
        echo "Directory 'youtube-search' already exists. Removing it..."
        rm -rf youtube-search
    fi
    
    echo "Cloning repository..."
    git clone https://github.com/hirotomoki12345/youtube-search.git

    cd youtube-search || exit

    echo "Installing dependencies..."
    npm install

    cd ..

    pm2 start server.js --name "Psannetwork-Youtube-Searcher"
    echo "Server has been set up successfully."
}

function remove_server {
    pm2 delete Psannetwork-Youtube-Searcher
    echo "Server has been removed successfully."
}

function check_logs {
    pm2 logs Psannetwork-Youtube-Searcher
}

while true; do
    echo ""
    echo "Please choose an option:"
    echo "1 - Set up the server"
    echo "2 - Remove the server"
    echo "3 - Check the logs"
    echo "4 - Quit"
    read -p "Your choice: " choice

    case $choice in
        1)
            setup_server
            ;;
        2)
            remove_server
            ;;
        3)
            check_logs
            ;;
        4)
            echo "Quitting..."
            exit 0
            ;;
        *)
            echo "Invalid choice. Please select a valid option."
            ;;
    esac
done
