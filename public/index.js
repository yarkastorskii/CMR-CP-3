(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const main__load = document.querySelector(".main__load")
    const mainContainer = document.querySelector(".main__container");
    const API_PREFIX = '/api/clients';

    // ------------------------------------------------------------
    // 1. UI: элементы управления и модальное окно
    // ------------------------------------------------------------
    let modal, modalForm, modalClose;
    const addButton = document.querySelector(".main__btn");
    const searchInput = document.querySelector(".header__search")

    function createUI() {
      // Модальное окно
      if (!document.querySelector('.modal')) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.dataset.state = 'none';
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
             <span class="modal-close"></span>
             <h2 class="modal-title">Новый клиент</h2>
            </div>
            <form class="modal-form">
              <div class="form-group">
                <span class="fake-placeholder">Фамилия<span class="asterisk">*</span></span>
                <input type="text" name="name" required>
              </div>
              <div class="form-group">
                <span class="fake-placeholder">Имя<span class="asterisk">*</span></span>
                <input type="text" name="surname" required>
              </div>
              <div class="form-group">
                <span class="fake-placeholder">Отчество</span>
                <input type="text" name="lastName">
              </div>
              <div class="contacts-group">
                <div class="contacts-list"></div>
                <button type="button" class="add-contact-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0_121_1874)">
                  <path d="M8.00001 4.66665C7.63334 4.66665 7.33334 4.96665 7.33334 5.33331V7.33331H5.33334C4.96668 7.33331 4.66668 7.63331 4.66668 7.99998C4.66668 8.36665 4.96668 8.66665 5.33334 8.66665H7.33334V10.6666C7.33334 11.0333 7.63334 11.3333 8.00001 11.3333C8.36668 11.3333 8.66668 11.0333 8.66668 10.6666V8.66665H10.6667C11.0333 8.66665 11.3333 8.36665 11.3333 7.99998C11.3333 7.63331 11.0333 7.33331 10.6667 7.33331H8.66668V5.33331C8.66668 4.96665 8.36668 4.66665 8.00001 4.66665ZM8.00001 1.33331C4.32001 1.33331 1.33334 4.31998 1.33334 7.99998C1.33334 11.68 4.32001 14.6666 8.00001 14.6666C11.68 14.6666 14.6667 11.68 14.6667 7.99998C14.6667 4.31998 11.68 1.33331 8.00001 1.33331ZM8.00001 13.3333C5.06001 13.3333 2.66668 10.94 2.66668 7.99998C2.66668 5.05998 5.06001 2.66665 8.00001 2.66665C10.94 2.66665 13.3333 5.05998 13.3333 7.99998C13.3333 10.94 10.94 13.3333 8.00001 13.3333Z" fill="#9873FF"/>
                  </g>
                  <defs>
                  <clipPath id="clip0_121_1874">
                  <rect width="16" height="16" fill="white"/>
                  </clipPath>
                  </defs>
                </svg>
                <span>Добавить контакт</span>
                </button>
              </div>
              <div class="form-actions">
                <button type="submit" class="save-btn">Сохранить</button>
                <button type="button" class="cancel-btn">Отмена</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);
        modalClose = modal.querySelector('.modal-close');
        modalForm = modal.querySelector('.modal-form');
      } else {
        modal = document.querySelector('.modal');
        modalClose = modal.querySelector('.modal-close');
        modalForm = modal.querySelector('.modal-form');
      }
      modal.style.display = "none";

      // Модальное окно подтверждения
      if (!document.querySelector('.confirm-modal')) {
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal confirm-modal';
        confirmModal.style.display = 'none';
        confirmModal.innerHTML = `
            <div class="modal-content confirm-content">
                <div class="modal-header">
                    <span class="modal-close"></span>
                    <h2 class="modal-title">Удалить клиента</h2>
                </div>
                <div class="confirm-message"></div>
                <div class="form-actions confirm-actions">
                    <button class="confirm-delete-btn">Удалить</button>
                    <button class="confirm-cancel-btn">Отмена</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
      }
    }

    // ------------------------------------------------------------
    // 2. Работа с API
    // ------------------------------------------------------------
    async function fetchClients(search = '') {
      const url = new URL(API_PREFIX, window.location.origin);
      if (search) url.searchParams.set('search', search);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Ошибка загрузки');
      return response.json();
    }

    async function createClient(data) {
      const response = await fetch(API_PREFIX, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.errors?.map(e => e.message).join(', ') || 'Ошибка создания');
      }
      return response.json();
    }

    async function updateClient(id, data) {
      const response = await fetch(`${API_PREFIX}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.errors?.map(e => e.message).join(', ') || 'Ошибка обновления');
      }
      return response.json();
    }

    async function deleteClient(id) {
      const response = await fetch(`${API_PREFIX}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    }

    async function fetchClientById(id) {
      const response = await fetch(`${API_PREFIX}/${id}`);
      if (!response.ok) throw new Error('Клиент не найден');
      return response.json();
    }

    // ------------------------------------------------------------
    // 3. Утилиты
    // ------------------------------------------------------------
    function getFullName(client) {
      return [client.name, client.surname, client.lastName].filter(Boolean).join(' ');
    }

    function getContactIcon(type) {
      const map = {
        'телефон': 'phone-icon',
        'email': 'email-icon',
        'vk': 'vk-icon',
        'facebook': 'fb-icon',
        'другое': 'other-icon'
      };
      return map[type.toLowerCase()] || 'contact-icon';
    }

    // ------------------------------------------------------------
    // 4. Рендер одной карточки клиента
    // ------------------------------------------------------------
    function createClientCard(client) {
      const card = document.createElement('tr');
      card.className = 'client-card';
      card.dataset.id = client.id;

      const creationDate = new Date(client.createdAt);
      const lastChange = new Date(client.updatedAt);

      // Контакты
      let contactsHtml = '';
      if (client.contacts && client.contacts.length > 0) {
        contactsHtml = client.contacts.map(contact => {
          const iconClass = getContactIcon(contact.type);
          return `<a href="${contact.value}" class="contact-icon ${iconClass}" target="_blank" data-tooltip="${contact.type}: ${contact.value}"></a>`;
        }).join('');
      } else {
        contactsHtml = '<span class="no-contacts">нет</span>';
      }

      card.innerHTML = `
              <td class="card__hcol id-value">${client.id}</td>
              <td class="card__hcol full-name">${getFullName(client)}</td>
              <td class="card__hcol date-value">
                <span class="LocalDate">${creationDate.toLocaleDateString()}</span>
                <span class="LocalTime">${creationDate.toLocaleTimeString()}</span>
              </td>
              <td class="card__hcol date-value">
                <span class="LocalDate">${lastChange.toLocaleDateString()}</span>
                <span class="LocalTime">${lastChange.toLocaleTimeString()}</span>
              </td>
              <td class="card__hcol contacts-block">${contactsHtml}</td>
              <td class="card__hcol actions-block">
                <button class="action-edit">Изменить</button>
                <button class="action-delete">Удалить</button>
              </td>
      `;

      // Обработчики кнопок
      card.querySelector('.action-delete').addEventListener('click', () => onDeleteClient(client.id, card));
      card.querySelector('.action-edit').addEventListener('click', () => openEditModal(client.id));

      return card;
    }

    // ------------------------------------------------------------
    // 5. Загрузка и отображение всех клиентов
    // ------------------------------------------------------------
    async function loadAndRenderClients(search = '') {
      mainContainer.classList.add('loading');
      try {
        const clients = await fetchClients(search);
        mainContainer.innerHTML = '';
        clients.forEach(client => {
          mainContainer.appendChild(createClientCard(client));
        });
        if (clients.length === 0) {
          mainContainer.innerHTML = '<p class="empty-message">Клиенты не найдены</p>';
        }
      } catch (error) {
        console.error(error);
        mainContainer.innerHTML = `<p class="error-message">Ошибка загрузки: ${error.message}</p>`;
      } finally {
        mainContainer.classList.toggle('loading', mainContainer.children.length === 0);
        if (main__load) {
          main__load.style.display = "none";
        }
      }
    }

    // ------------------------------------------------------------
    // 6. Удаление клиента
    // ------------------------------------------------------------
    async function onDeleteClient(id, cardElement) {
      showConfirmDialog('Вы действительно хотите удалить этого клиента?', async () => {
          try {
              await deleteClient(id);
              cardElement.remove();
              if (mainContainer.children.length === 0) {
                  mainContainer.classList.add('loading');
              }
          } catch (error) {
              alert(`Ошибка удаления: ${error.message}`);
          }
      });
  }

    // ------------------------------------------------------------
    // 7. Модальное окно (добавление / редактирование)
    // ------------------------------------------------------------

    function initFakePlaceholders(form) {
      const groups = form.querySelectorAll('.form-group');
      groups.forEach(group => {
          const input = group.querySelector('input');
          if (!input) return;
          function updateFilledState() {
              if (input.value.trim() !== '') {
                  group.classList.add('form-group--filled');
              } else {
                  group.classList.remove('form-group--filled');
              }
          }
          updateFilledState(); // установка при загрузке
          input.addEventListener('input', updateFilledState);
          // сохраним обработчик для возможного удаления (необязательно)
          input._updateFilledState = updateFilledState;
      });
    }

    const originalOpenAddModal = openAddModal;
    const originalOpenEditModal = openEditModal;

    let editingClientId = null;
    let isSubmitting = false;
    let originalClientData = null;
    let modalErrorElement = null;

    // Функция показа модального окна подтверждения
    function showConfirmDialog(message, onConfirm, onCancel) {
      const confirmModal = document.querySelector('.confirm-modal');
      const confirmMessage = confirmModal.querySelector('.confirm-message');
      const deleteBtn = confirmModal.querySelector('.confirm-delete-btn');
      const cancelBtn = confirmModal.querySelector('.confirm-cancel-btn');
      const closeBtn = confirmModal.querySelector('.modal-close');
      
      confirmMessage.textContent = message;
      
      // Обработчики (одноразовые)
      const handleConfirm = () => {
          confirmModal.style.display = 'none';
          cleanup();
          if (onConfirm) onConfirm();
      };
      
      const handleCancel = () => {
          confirmModal.style.display = 'none';
          cleanup();
          if (onCancel) onCancel();
      };
      
      const cleanup = () => {
          deleteBtn.removeEventListener('click', handleConfirm);
          cancelBtn.removeEventListener('click', handleCancel);
          closeBtn.removeEventListener('click', handleCancel);
          // Также убираем клик по фону
          confirmModal.removeEventListener('click', backdropHandler);
      };
      
      const backdropHandler = (e) => {
          if (e.target === confirmModal) {
              handleCancel();
          }
      };
      
      deleteBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);
      confirmModal.addEventListener('click', backdropHandler);
      
      confirmModal.style.display = 'flex';
    }

    function openAddModal() {
      editingClientId = null;
      originalClientData = null;
      removeModalError();
      modal.querySelector('.modal-title').textContent = 'Новый клиент';
      modal.querySelector(".cancel-btn").textContent = 'Отмена';
      modalForm.reset();
      clearContacts();
      modal.style.display = 'flex';
      modal.dataset.state = "add";
      initFakePlaceholders(modalForm);
      setFormDisabled(false);
      showModalLoading(false);
    }

    function setFormDisabled(disabled) {
      const inputs = modalForm.querySelectorAll('input, select, button');
      inputs.forEach(el => {
        if (el.classList && (el.classList.contains('save-btn') || el.classList.contains('cancel-btn') || el.classList.contains('add-contact-btn'))) {
          // Кнопки тоже блокируем
          el.disabled = disabled;
        } else if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
          el.disabled = disabled;
        }
      });
    }
    
    function showModalLoading(show) {
      let loader = modal.querySelector('.modal-loader');
      if (show) {
        if (!loader) {
          loader = document.createElement('div');
          loader.className = 'modal-loader loading';
          loader.style.position = 'absolute';
          loader.style.top = '0';
          loader.style.left = '0';
          loader.style.width = '100%';
          loader.style.height = '100%';
          loader.style.backgroundColor = 'rgba(255,255,255,0.7)';
          loader.style.display = 'flex';
          loader.style.alignItems = 'center';
          loader.style.justifyContent = 'center';
          loader.style.zIndex = '10';
          loader.innerHTML = '<div class="spinner"></div>';
          modal.querySelector('.modal-content').style.position = 'relative';
          modal.querySelector('.modal-content').appendChild(loader);
        }
        loader.style.display = 'flex';
      } else {
        if (loader) loader.style.display = 'none';
      }
    }

    async function openEditModal(clientId) {
      // Показываем модальное окно в режиме загрузки
      editingClientId = clientId;
      modal.querySelector('.modal-title').textContent = 'Редактировать клиента';
      modal.querySelector(".cancel-btn").textContent = 'Удалить клиента';
      modalForm.reset();
      clearContacts();
      
      // Блокируем все поля и кнопки во время загрузки
      setFormDisabled(true);
      showModalLoading(true);
      
      modal.style.display = 'flex';
      modal.dataset.state = "edit";
      modal.dataset.client_id = clientId;
      
      try {
        const client = await fetchClientById(clientId);
        // Заполняем форму
        modalForm.elements['name'].value = client.name || '';
        modalForm.elements['surname'].value = client.surname || '';
        modalForm.elements['lastName'].value = client.lastName || '';
        if (client.contacts && client.contacts.length) {
          client.contacts.forEach(c => addContactToForm(c.type, c.value));
        }
        originalClientData = {
          name: client.name || '',
          surname: client.surname || '',
          lastName: client.lastName || '',
          contacts: client.contacts ? client.contacts.map(c => ({ type: c.type, value: c.value })) : []
        };
        // Убираем блокировку после загрузки
        setFormDisabled(false);
        showModalLoading(false);
        initFakePlaceholders(modalForm);
      } catch (error) {
        console.error(error);
        alert('Не удалось загрузить данные клиента');
        closeModal();
      }
    }

    function closeModal() {
      modal.style.display = 'none';
      modalForm.reset();
      clearContacts();
      editingClientId = null;
      originalClientData = null;
      removeModalError();
      modal.dataset.state = "closed";
    }

    // Вспомогательная функция для удаления сообщения об ошибке
    function removeModalError() {
      if (modalErrorElement) {
        modalErrorElement.remove();
        modalErrorElement = null;
      }
    }

    // Работа с контактами в форме
    function clearContacts() {
      modalForm.querySelector('.contacts-list').innerHTML = '';
    }

    function addContactToForm(type = '', value = '') {
      const list = modalForm.querySelector('.contacts-list');
      const row = document.createElement('div');
      row.className = 'contact-row';
      row.innerHTML = `
        <select class="contact-type">
          <option value="телефон" ${type === 'телефон' ? 'selected' : ''}>Телефон</option>
          <option value="email" ${type === 'email' ? 'selected' : ''}>Email</option>
          <option value="vk" ${type === 'vk' ? 'selected' : ''}>VK</option>
          <option value="facebook" ${type === 'facebook' ? 'selected' : ''}>Facebook</option>
          <option value="другое" ${type === 'другое' ? 'selected' : ''}>Другое</option>
        </select>
        <input type="text" class="contact-value" placeholder="Введите значение" value="${value}">
        <button type="button" class="remove-contact-btn">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_121_2816)">
          <path d="M8 2C4.682 2 2 4.682 2 8C2 11.318 4.682 14 8 14C11.318 14 14 11.318 14 8C14 4.682 11.318 2 8 2ZM8 12.8C5.354 12.8 3.2 10.646 3.2 8C3.2 5.354 5.354 3.2 8 3.2C10.646 3.2 12.8 5.354 12.8 8C12.8 10.646 10.646 12.8 8 12.8ZM10.154 5L8 7.154L5.846 5L5 5.846L7.154 8L5 10.154L5.846 11L8 8.846L10.154 11L11 10.154L8.846 8L11 5.846L10.154 5Z" fill="#B0B0B0"/>
          </g>
          <defs>
          <clipPath id="clip0_121_2816">
          <rect width="16" height="16" fill="white"/>
          </clipPath>
          </defs>
        </svg>                   
        </button>
      `;
      row.querySelector('.remove-contact-btn').addEventListener('click', () => row.remove());
      list.appendChild(row);
    }

    function showInlineError(message) {
      removeModalError();
      modalErrorElement = document.createElement('div');
      modalErrorElement.className = 'error-msg';
      modalErrorElement.innerHTML = `<span>${message}</span>`;
      const formActions = modalForm.querySelector('.form-actions');
      modalForm.insertBefore(modalErrorElement, formActions);
    }

    // Отправка формы
    async function handleFormSubmit(e) {
      e.preventDefault();
      
      removeModalError();
    
      // Блокируем форму на время отправки
      if (isSubmitting) return;
      isSubmitting = true;
      setFormDisabled(true);
      showModalLoading(true);
    
      try {
        const name = modalForm.elements['name'].value.trim();
        const surname = modalForm.elements['surname'].value.trim();
        const lastName = modalForm.elements['lastName'].value.trim();
    
        if (!name || !surname) {
          showInlineError('Имя и фамилия обязательны');
          return;
        }
    
        const contactRows = modalForm.querySelectorAll('.contact-row');
        const contacts = [];
        let hasEmptyContact = false;
        contactRows.forEach(row => {
          const type = row.querySelector('.contact-type').value.trim();
          const value = row.querySelector('.contact-value').value.trim();
          if (type && value) contacts.push({ type, value });
          else if (type || value) hasEmptyContact = true; // не полностью заполнен
        });
        
        if (hasEmptyContact) {
          showInlineError('Все добавленные контакты должны быть полностью заполнены');
          return;
        }
    
        // Проверка на неизменность данных при редактированииshowInlineError
        if (editingClientId && originalClientData) {
          const dataUnchanged =
            name === originalClientData.name &&
            surname === originalClientData.surname &&
            lastName === originalClientData.lastName &&
            JSON.stringify(contacts) === JSON.stringify(originalClientData.contacts);
          if (dataUnchanged) {
            showInlineError('Нет изменений для сохранения');
            return;
          }
        }
    
        const data = { name, surname, lastName, contacts };
        
        if (editingClientId) {
          await updateClient(editingClientId, data);
        } else {
          await createClient(data);
        }
        
        closeModal();
        loadAndRenderClients(searchInput.value);
      } catch (error) {
        // Показываем ошибку от сервера или стандартное сообщение
        let errorMsg = error.message;
        if (error.errors && Array.isArray(error.errors)) {
          errorMsg = error.errors.map(e => e.message).join(', ');
        }
        showInlineError(errorMsg || 'Что-то пошло не так...');
      } finally {
        isSubmitting = false;
        setFormDisabled(false);
        showModalLoading(false);
      }
    }

    // ------------------------------------------------------------
    // 8. Поиск с задержкой (debounce)
    // ------------------------------------------------------------
    let searchTimeout;
    function onSearchInput() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadAndRenderClients(searchInput.value);
      }, 300);
    }

    // ------------------------------------------------------------
    // 9. Автодополнение
    // ------------------------------------------------------------

    function initAutocomplete() {
      const suggestionsList = document.getElementById('suggestionsList');
      let currentFocus = -1;

      // debounce для подсказок (200 мс)
      function debounce(fn, delay) {
        let timer;
        return function(...args) {
          clearTimeout(timer);
          timer = setTimeout(() => fn.apply(this, args), delay);
        };
      }

      // Загрузка подсказок через API
      async function fetchSuggestions(query) {
        if (!query.trim()) return [];
        try {
          // Используем тот же search-запрос, что и для таблицы
          const clients = await fetchClients(query);
          // Берём ФИО, убираем дубликаты, ограничиваем до 10
          const names = clients
            .map(c => getFullName(c))
            .filter((v, i, a) => v && a.indexOf(v) === i)
            .slice(0, 10);
          return names;
        } catch (e) {
          console.error(e);
          return [];
        }
      }

      // Отрисовка
      function renderSuggestions(items) {
        suggestionsList.innerHTML = '';
        if (!items.length) {
          suggestionsList.style.display = 'none';
          return;
        }
        items.forEach(name => {
          const li = document.createElement('li');
          li.textContent = name;
          li.addEventListener('click', function() {
            searchInput.value = name;
            suggestionsList.style.display = 'none';
            // запускаем поиск по таблице
            loadAndRenderClients(name);
          });
          suggestionsList.appendChild(li);
        });
        suggestionsList.style.display = 'block';
        currentFocus = -1;
      }

      // Обработчик ввода с debounce
      const handleSuggestions = debounce(async (query) => {
        const items = await fetchSuggestions(query);
        renderSuggestions(items);
      }, 200);

      searchInput.addEventListener('input', function(e) {
        const val = e.target.value;
        handleSuggestions(val);
      });

      // Навигация стрелками и Enter
      searchInput.addEventListener('keydown', function(e) {
        const items = suggestionsList.getElementsByTagName('li');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
          currentFocus++;
          if (currentFocus >= items.length) currentFocus = 0;
          setActiveSuggestion(items);
        } else if (e.key === 'ArrowUp') {
          currentFocus--;
          if (currentFocus < 0) currentFocus = items.length - 1;
          setActiveSuggestion(items);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (currentFocus > -1 && items[currentFocus]) {
            items[currentFocus].click();
          }
        }
      });

      function setActiveSuggestion(items) {
        Array.from(items).forEach((item, idx) => {
          item.classList.toggle('active', idx === currentFocus);
        });
      }

      // Скрытие списка при клике вне
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-wrapper')) {
          suggestionsList.style.display = 'none';
          currentFocus = -1;
        }
      });
    }


    // ------------------------------------------------------------
    // 10. Инициализация
    // ------------------------------------------------------------
    function init() {
      createUI();
      initAutocomplete();
      searchInput.addEventListener('input', onSearchInput);
      addButton.addEventListener('click', openAddModal);
      modalClose.addEventListener('click', closeModal);
      window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      modalForm.addEventListener('submit', handleFormSubmit);
      modal.querySelector('.cancel-btn').addEventListener('click', () => {
        if (modal.dataset.state === "edit") {
            const client_id = modal.dataset.client_id;
            if (!client_id) return;
            showConfirmDialog('Вы действительно хотите удалить этого клиента?', async () => {
                try {
                    await deleteClient(client_id);
                    await loadAndRenderClients(searchInput.value);
                    closeModal();
                } catch (err) {
                    console.error(err);
                    alert(`Ошибка удаления: ${err.message}`);
                }
            });
        } else {
            closeModal();
        }
    });
      modal.querySelector('.add-contact-btn').addEventListener('click', () => addContactToForm());

      // Первая загрузка данных с сервера
      loadAndRenderClients();
    }

    init();
  });
})();