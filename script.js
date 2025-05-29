
document.addEventListener('DOMContentLoaded', function () {
  const apiUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhO6YJbC0SU2WFwHParGVJgPsidd-BDQPmaDubOZ5FBeYqzflar-N5MsKZiEnDFvf1ze0lWoG_Aapon6mCeq1FG56mnGpeeXB_9eM7C44RXpV8XB9Lv0bUDkIqOQKl3UC3Hf-SEIqWnTMuBR6rMCinKGb9KbCLbm5XqkebedCd5Kz0SRxPtmdCXefrtGgBPJ_nYzf3s8A9uO-zwBNYbZav7vS9l3bF7aEfFrtWdFa4kYQCPHjGYdATwDMELl5ICNxgO-cD6gHaZySDm5Z7uHkMNVoFGWg&lib=MUfngVQZI-VtDgiXId2WKgXQNFQG3epjV';
  const dataContainer = document.getElementById('dataContainer');
  const statsElement = document.getElementById('stats');

  let originalData = [];
  let groupedData = {};
  let searchTimeout;

  // Cache para mejorar performance
  const cache = new Map();

  // Función para cargar los datos
  async function loadData() {
    try {
      // Check cache first
      const cached = cache.get('studentData');
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutos
        originalData = cached.data.data;
        updateStats(cached.data);
        groupData(originalData);
        displayData(groupedData);
        return;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Error al cargar los datos');
      }
      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error('Datos no disponibles');
      }

      // Cache the data
      cache.set('studentData', {
        data: data,
        timestamp: Date.now()
      });

      originalData = data.data;
      updateStats(data);
      groupData(originalData);
      displayData(groupedData);

    } catch (error) {
      dataContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
      console.error('Error:', error);
    }
  }

  // Función para actualizar las estadísticas
  function updateStats(data) {
    statsElement.innerHTML = `
      Total de alumnos: ${data.count} | 
      Última actualización: ${new Date(data.timestamp).toLocaleString()}
    `;
  }

  // Función para agrupar los datos por curso
  function groupData(data) {
    groupedData = {};

    data.forEach(item => {
      if (!groupedData[item.CURSO]) {
        groupedData[item.CURSO] = [];
      }
      groupedData[item.CURSO].push(item);
    });
  }

  // Función para formatear el número de teléfono
  function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    const phoneStr = phone.toString();
    return phoneStr.length === 10 ?
      `${phoneStr.substring(0, 2)}-${phoneStr.substring(2, 6)}-${phoneStr.substring(6)}` :
      phoneStr;
  }

  // Función para mostrar los datos
  function displayData(data) {
    if (Object.keys(data).length === 0) {
      dataContainer.innerHTML = `
        <div class="error">
          <h3>No se encontraron resultados</h3>
          <p>Intenta con otros términos de búsqueda o verifica la conexión.</p>
        </div>
      `;
      return;
    }

    let html = '';
    const sortedCourses = Object.keys(data).sort();

    sortedCourses.forEach(course => {
      const students = data[course];

      html += `
        <div class="course-section">
          <div class="course-header" role="button" tabindex="0" aria-expanded="false">
            <span>${course} (${students.length} alumnos)</span>
            <span class="arrow">▶</span>
          </div>
          <div class="course-content">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Apellido</th>
                    <th>Nombre</th>
                    <th>DNI</th>
                    <th>Empresa</th>
                    <th>Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map(student => `
                    <tr>
                      <td>${student.APELLIDO}</td>
                      <td>${student.NOMBRE}</td>
                      <td class="nowrap">${student.DNI || 'N/A'}</td>
                      <td>${student.EMPRESA || 'N/A'}</td>
                      <td class="contact-info">
                        <span>${formatPhoneNumber(student.TELEFONO)}</span>
                        <span>${student.MAILS || 'N/A'}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    });

    dataContainer.innerHTML = html;

    // Agregar event listeners para los acordeones
    document.querySelectorAll('.course-header').forEach(header => {
      header.addEventListener('click', toggleAccordion);
      header.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleAccordion.call(this);
        }
      });
    });
  }

  function toggleAccordion() {
    const content = this.nextElementSibling;
    const arrow = this.querySelector('.arrow');
    const isExpanded = content.classList.contains('show');

    content.classList.toggle('show');
    arrow.classList.toggle('down');
    this.setAttribute('aria-expanded', !isExpanded);
  }

  // Función para buscar con debounce mejorado
  function searchData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!searchTerm) {
      groupData(originalData);
      displayData(groupedData);
      return;
    }

    const filteredData = originalData.filter(item => {
      const searchFields = [
        item.APELLIDO,
        item.NOMBRE,
        item.EMPRESA,
        item.CURSO,
        item.DNI?.toString(),
        item.MAILS
      ];

      return searchFields.some(field => 
        field && field.toLowerCase().includes(searchTerm)
      );
    });

    groupData(filteredData);
    displayData(groupedData);
  }

  // Event listeners
  document.getElementById('searchButton').addEventListener('click', searchData);
  
  // Real-time search with debounce
  document.getElementById('searchInput').addEventListener('input', function (e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchData();
    }, 300);
  });
  
  document.getElementById('searchInput').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeout);
      searchData();
    }
  });

  // Cargar los datos iniciales
  loadData();
});
