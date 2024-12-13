const toggleChat = () => {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.style.display = chatContainer.style.display === 'block' ? 'none' : 'block';
}

const sendMessage = async () => {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');

    if (input.value.trim() !== '') {
        const userMessage = document.createElement('div');
        userMessage.textContent = input.value;
        userMessage.className = 'my-2 p-2 bg-gray-700 rounded text-white';
        messages.appendChild(userMessage);

        const userInput = input.value;
        input.value = '';
        messages.scrollTop = messages.scrollHeight;

        try {
            const response = await fetch('127.0.0.1:5000/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userInput })
            });

            if (response.ok) {
                const data = await response.json();
                const botMessage = document.createElement('div');
                botMessage.textContent = data.response;
                botMessage.className = 'my-2 p-2 bg-gray-800 rounded text-gray-300';
                messages.appendChild(botMessage);
                messages.scrollTop = messages.scrollHeight;
            } else {
                console.error('Error: Failed to get a response from the /chat endpoint.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}
