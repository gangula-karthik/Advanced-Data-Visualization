const toggleChat = () => {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.style.display = chatContainer.style.display === 'block' ? 'none' : 'block';
}

const sendMessage = async () => {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');

    if (input.value.trim() !== '') {
        // Add the user's message to the chat
        const userMessage = document.createElement('div');
        userMessage.textContent = input.value;
        userMessage.className = 'my-2 p-2 bg-gray-700 rounded text-white';
        messages.appendChild(userMessage);

        const userInput = input.value;
        input.value = '';
        messages.scrollTop = messages.scrollHeight;

        try {
            const response = await fetch('http://127.0.0.1:5000/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: userInput })
            });

            if (response.ok) {
                const data = await response.json();

                if (data.result) {
                    const botMessage = document.createElement('div');
                    botMessage.textContent = data.result; // Display the result from the backend
                    botMessage.className = 'my-2 p-2 bg-gray-800 rounded text-gray-300';
                    messages.appendChild(botMessage);
                    messages.scrollTop = messages.scrollHeight;
                } else {
                    const errorMessage = document.createElement('div');
                    errorMessage.textContent = 'Error: No response received from the bot.';
                    errorMessage.className = 'my-2 p-2 bg-red-600 rounded text-white';
                    messages.appendChild(errorMessage);
                }
            } else {
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Error: Failed to fetch a response from the server.';
                errorMessage.className = 'my-2 p-2 bg-red-600 rounded text-white';
                messages.appendChild(errorMessage);
            }
        } catch (error) {
            const errorMessage = document.createElement('div');
            errorMessage.textContent = `Error: ${error.message}`;
            errorMessage.className = 'my-2 p-2 bg-red-600 rounded text-white';
            messages.appendChild(errorMessage);
        }
    }
}
