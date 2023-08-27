$(document).ready(function () {
    var CryptoJS = window.CryptoJS || {};
    var socket = io();
    var sharedKey; // Общий ключ
    var chatBox = $('#chatBox');
    var chatTitle = $('#chatTitle');
    var messages = $('#messages');
    var messageInput = $('#messageInput');
    var otherUserIdInput = $('#otherUserIdInput');

    socket.on('connect', function () {
        console.log('Connected');
    });

    socket.on('join_chat', function (chat) {
        showChat(chat.id);
    });

    socket.on('disconnect', function () {
        console.log('Disconnected');
    });

    socket.on('user_connected', function (user) {
        addUser(user);
    });

    socket.on('user_disconnected', function (user_id) {
        removeUser(user_id);
    });

    socket.on('chat_joined', function (chat) {
        addChat(chat);
    });

    socket.on('chat_left', function (chat_id) {
        removeChat(chat_id);
    });

    socket.on('msg_sent', function (data) {
        addMessage(data);
    });

    // RSA key generation
    var crypt = new JSEncrypt({default_key_size: 2048});

    function generateRSAKeys() {
        crypt.getKey();
    }

    function encryptRSA(message, publicKey) {
        var encrypt = new JSEncrypt();
        encrypt.setPublicKey(publicKey);
        return encrypt.encrypt(message);
    }

    function decryptRSA(encryptedMessage) {
        return crypt.decrypt(encryptedMessage);
    }

    function addUser(user) {
        $('#users').append($('<li>').attr('id', user.id).text(user.id));
    }

    function removeUser(user_id) {
        $('#' + user_id).remove();
    }

    function addChat(chat) {
        var chatItem = $('<li>').attr('id', chat.id).text(chat.id).click(function () {
            var chatId = $(this).attr('id');
            showChat(chatId);
        });
        $('#chats').append(chatItem);
        if (chatTitle.text() === '') {
            var chatId = chatItem.attr('id');
            showChat(chatId);
        }
    }

    function removeChat(chat_id) {
        $('#' + chat_id).remove();
        if (chatTitle.attr('data-chat-id') === chat_id) {
            chatBox.hide();
            chatTitle.text('');
            messages.empty();
        }
    }

    function joinChat(otherUserId) {
        var currentUserId = socket.id;
        if (currentUserId !== otherUserId) {
            socket.emit('join_chat', {'user_id': otherUserId});
        } else {
            console.log('Вы не можете начать чат с самим собой.');
            // Display an error message or take other actions as needed
        }
    }

    function leaveChat() {
        var chatId = chatTitle.attr('data-chat-id');
        socket.emit('leave_chat', chatId);
        chatBox.hide();
        chatTitle.text('');
        messages.empty();
    }

    function showChat(chatId) {
        var chatTitleText = $('#' + chatId).text();
        chatTitle.text(chatTitleText).attr('data-chat-id', chatId);
        chatBox.show();
        messages.empty();
    }

    function encryptMessage(message, publicKey) {
        var encrypt = new JSEncrypt();
        encrypt.setPublicKey(publicKey);
        var encryptedMessage = encrypt.encrypt(message);
        return encryptedMessage;
    }

    function decryptMessage(encryptedMessage) {
        var decryptedMessage = crypt.decrypt(encryptedMessage);
        return decryptedMessage;
    }

    function addMessage(data) {
        var chatId = chatTitle.attr('data-chat-id');
        if (data.chat_id === chatId) {
            var encryptedMessage = data.message;
            var decryptedMessage = decryptMessage(encryptedMessage, sharedKey);
            var messageText = '[' + decryptedMessage.timestamp + '] ' + decryptedMessage.user_id + ': ' + decryptedMessage.message;
            messages.append($('<li>').text(messageText));
            // Scroll to the bottom to see new messages
            var messagesDiv = messages[0];
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    // Generate RSA keys on page load
    generateRSAKeys();

    // Делегирование событий для кнопок "Отправить" и "Покинуть чат"
    chatBox.on('click', '#sendButton', function () {
        var chatId = chatTitle.attr('data-chat-id');
        var message = messageInput.val();
        var encryptedMessage = encryptMessage(message, sharedKey);
        socket.emit('send_massage', {'chat_id': chatId, 'message': encryptedMessage});
        messageInput.val('');
    });

    chatBox.on('click', '#leaveButton', function () {
        leaveChat();
    });

    // Обработчик события для кнопки "Начать"
    $('#startChatButton').click(function () {
        var otherUserId = otherUserIdInput.val();
        joinChat(otherUserId);
        otherUserIdInput.val('');
    });
});
