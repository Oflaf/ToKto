// ad.js
document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');

    if (!chatBox) {
        console.error('Element #chat-box nie został znaleziony.');
        return;
    }

    const createAnnouncementsFrame = () => {
        chatBox.innerHTML = '';

        const infoText = document.createElement('p');
        infoText.className = 'chat-box-intro-text';
        infoText.innerHTML = 'Kliknij <strong>przycisk w lewym dolnym rogu</strong>, aby rozpocząć anonimowy czat. Wybierz województwo lub przejdź do następnej rozmowy.';
        chatBox.appendChild(infoText);

        const wrapper = document.createElement('div');
        wrapper.id = 'announcements-wrapper';

        const announcementsFrame = document.createElement('div');
        announcementsFrame.id = 'announcements-frame';
        announcementsFrame.className = 'announcements-frame';

        const header = document.createElement('h3');
        header.textContent = 'Ogłoszenia:';
        announcementsFrame.appendChild(header);

        const fbStaticLink = document.createElement('a');
        fbStaticLink.className = 'announcement-fb-static';
        fbStaticLink.href = 'https://www.facebook.com/profile.php?id=61586313201204';
        fbStaticLink.target = '_blank';
        fbStaticLink.rel = 'noopener noreferrer';
        
        const fbStaticImage = document.createElement('img');
        fbStaticImage.src = 'public/img/fb.png'; 
        fbStaticImage.alt = 'Przejdź do Facebooka';
        
        fbStaticLink.appendChild(fbStaticImage);
        announcementsFrame.appendChild(fbStaticLink);
       
        const announcementsContent = document.createElement('div');
        announcementsContent.id = 'announcements-content';
        announcementsContent.className = 'announcements-content';
        announcementsFrame.appendChild(announcementsContent);

        // --- POCZĄTEK NOWEGO KODU ---
        const footerNote = document.createElement('p');
        footerNote.className = 'announcements-footer-note';

        const footerLink = document.createElement('a');
        footerLink.href = 'https://www.facebook.com/profile.php?id=61586313201204';
        footerLink.target = '_blank';
        footerLink.rel = 'noopener noreferrer';
        footerLink.textContent = 'facebooku';

        const strongTag = document.createElement('strong');
        strongTag.appendChild(footerLink);

        footerNote.append('Aby dodać ogłoszenie wyślij nam prywatną wiadomość na ');
        footerNote.appendChild(strongTag);

        announcementsFrame.appendChild(footerNote);
        // --- KONIEC NOWEGO KODU ---

        wrapper.appendChild(announcementsFrame);
        chatBox.appendChild(wrapper);

        fetch('og.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Błąd HTTP! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const announcements = text.trim().split(/\n\s*\n/);
                announcements.forEach(ann => {
                    const lines = ann.trim().split('\n');
                    if (lines.length < 3) return; 

                    const date = lines.pop(); 
                    const contact = lines.pop();
                    const content = lines.join('\n'); 

                    const itemLink = document.createElement('a');
                    itemLink.className = 'announcement-item';
                    itemLink.href = 'https://www.facebook.com/profile.php?id=61586313201204';
                    itemLink.target = '_blank';
                    itemLink.rel = 'noopener noreferrer';

                    const postHeader = document.createElement('div');
                    postHeader.className = 'announcement-fb-header';
                    
                    const logoImg = document.createElement('img');
                    logoImg.src = 'public/img/fb_logo.png';
                    logoImg.alt = 'Logo Facebook';
                    logoImg.className = 'announcement-fb-logo';

                    const pageInfoDiv = document.createElement('div');
                    pageInfoDiv.className = 'announcement-fb-pageinfo';

                    const pageName = document.createElement('span');
                    pageName.className = 'announcement-fb-pagename';
                    pageName.textContent = 'ToKto.pl';

                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'announcement-date';
                    dateSpan.textContent = date;
                    
                    pageInfoDiv.appendChild(pageName);
                    pageInfoDiv.appendChild(dateSpan);

                    postHeader.appendChild(logoImg);
                    postHeader.appendChild(pageInfoDiv);

                    const textP = document.createElement('p');
                    textP.className = 'announcement-text';
                    textP.textContent = content;

                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'announcement-meta';
                    const contactStrong = document.createElement('strong');
                    contactStrong.className = 'announcement-contact';
                    contactStrong.textContent = contact;
                    metaDiv.appendChild(contactStrong);

                    const postFooter = document.createElement('div');
                    postFooter.className = 'announcement-fb-footer';
                    
                    const likeBtn = document.createElement('div');
                    likeBtn.className = 'announcement-action-button';
                    likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Lubię to!';

                    const commentBtn = document.createElement('div');
                    commentBtn.className = 'announcement-action-button';
                    commentBtn.innerHTML = '<i class="fas fa-comment"></i> Komentarz';

                    const shareBtn = document.createElement('div');
                    shareBtn.className = 'announcement-action-button';
                    shareBtn.innerHTML = '<i class="fas fa-share"></i> Udostępnij';
                    
                    postFooter.appendChild(likeBtn);
                    postFooter.appendChild(commentBtn);
                    postFooter.appendChild(shareBtn);

                    itemLink.appendChild(postHeader);
                    itemLink.appendChild(textP);
                    itemLink.appendChild(metaDiv);
                    itemLink.appendChild(postFooter);
                    
                    announcementsContent.appendChild(itemLink);
                });
            })
            .catch(error => {
                console.error('Błąd podczas wczytywania ogłoszeń:', error);
                announcementsContent.innerHTML = '<p class="system-message" style="text-align: center;">Nie udało się załadować ogłoszeń.</p>';
            });
    };

    createAnnouncementsFrame();

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && chatBox.children.length === 0) {
                if (!document.getElementById('announcements-wrapper')) {
                    createAnnouncementsFrame();
                }
            }
        }
    });

    observer.observe(chatBox, { childList: true });
});