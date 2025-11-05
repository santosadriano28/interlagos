document.addEventListener('DOMContentLoaded', () => {
    const inputSite = document.getElementById('inputSite');
    const inputPCI = document.getElementById('inputPCI');
    const searchForm = document.getElementById('searchForm');
    const siteError = document.getElementById('siteError');
    const pciError = document.getElementById('pciError');
    const resultsContainer = document.getElementById('resultsContainer');
    const dataTableBody = document.querySelector('#dataTable tbody');
    const noResultsMessage = document.getElementById('noResults');
    const autocompleteList = document.getElementById('autocompleteList');

    let allData = [];
    let siteColumnValues = new Set(); // Para o autocomplete

    // Função para carregar e processar o CSV
    async function loadCSV() {
        try {
            const response = await fetch('dataBase.csv');
            if (!response.ok) {
                throw new Error('Erro ao carregar o arquivo dataBase.csv');
            }
            const text = await response.text();
            
            // Separa por linhas e ignora a primeira (cabeçalho)
            const lines = text.trim().split('\n');
            const dataLines = lines.slice(1); 
            
            allData = dataLines.map(line => {
                // *** Usando ';' como delimitador ***
                const [siteRaw, pci, setor, rede] = line.split(';');
                
                // Trata o campo Site para pegar APENAS os 7 primeiros caracteres alfanuméricos
                const cleanedSite = siteRaw ? siteRaw.trim().toUpperCase().slice(0, 7).replace(/[^A-Z0-9]/g, '') : '';
                
                // Popula o set de valores de site
                if (cleanedSite && cleanedSite.length === 7) {
                    siteColumnValues.add(cleanedSite);
                }

                return {
                    site: cleanedSite,
                    pci: pci ? pci.trim() : '',
                    setor: setor ? setor.trim() : '',
                    rede: rede ? rede.trim().toUpperCase() : ''
                };
            }).filter(item => item.site.length === 7); // Filtra só sites válidos de 7 caracteres
            
            console.log(`CSV carregado. Total de ${allData.length} registros válidos.`);

        } catch (error) {
            console.error('Falha ao carregar ou processar o CSV:', error);
            alert('Não foi possível carregar os dados. Verifique o arquivo dataBase.csv e o delimitador (deve ser ;).');
        }
    }

    // --- Lógica de Validação e Formatação ---

    // 1. Input Site (7 chars, alfanumérico, maiúsculas)
    inputSite.addEventListener('input', (e) => {
        let value = e.target.value;
        
        // Converte para maiúsculas e filtra caracteres inválidos (apenas letras e números)
        value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.value = value;
        
        siteError.textContent = ''; // Limpa a mensagem de erro

        // Desabilita/Limpa o campo PCI quando o Site é preenchido
        if (value.length > 0) {
            inputPCI.disabled = true;
            inputPCI.value = '';
            pciError.textContent = '';
        } else {
            inputPCI.disabled = false;
        }
        
        // Autocomplete (após o 6º caractere)
        if (value.length >= 6) {
            showAutocomplete(value);
        } else {
            autocompleteList.innerHTML = ''; // Limpa antes de 6
        }
    });

    // 2. Input PCI (1 a 3 dígitos, apenas números)
    inputPCI.addEventListener('input', (e) => {
        let value = e.target.value;
        
        // Filtra apenas números
        value = value.replace(/[^0-9]/g, '');
        e.target.value = value;

        pciError.textContent = ''; // Limpa a mensagem de erro

        // Desabilita/Limpa o campo Site quando o PCI é preenchido
        if (value.length > 0) {
            inputSite.disabled = true;
            inputSite.value = '';
            siteError.textContent = '';
            autocompleteList.innerHTML = '';
        } else {
            inputSite.disabled = false;
        }
    });

    // --- Lógica de Autocomplete (Garante que só Sites válidos sejam sugeridos) ---
    function showAutocomplete(text) {
        if (text.length < 6) return;

        autocompleteList.innerHTML = '';
        
        // 1. Filtrar (apenas sites que começam com o texto digitado)
        let matchingSites = Array.from(siteColumnValues).filter(site => 
            site.startsWith(text)
        );
        
        // 2. Ordenar alfabeticamente crescente
        matchingSites.sort();

        // 3. Limitar a 10
        matchingSites = matchingSites.slice(0, 10);

        if (matchingSites.length > 0) {
            matchingSites.forEach(site => {
                const item = document.createElement('div');
                item.textContent = site;
                item.addEventListener('click', () => {
                    inputSite.value = site;
                    autocompleteList.innerHTML = '';
                    siteError.textContent = ''; 
                    inputPCI.disabled = true;
                    inputPCI.value = '';
                });
                autocompleteList.appendChild(item);
            });
        }
    }
    
    // Esconde o autocomplete ao clicar fora
    document.addEventListener('click', (e) => {
        if (!autocompleteList.contains(e.target) && e.target !== inputSite) {
            autocompleteList.innerHTML = '';
        }
    });

    // --- Lógica de Pesquisa (Ajustada) ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Limpa resultados anteriores e erros
        dataTableBody.innerHTML = '';
        resultsContainer.classList.add('hidden');
        noResultsMessage.classList.add('hidden');
        siteError.textContent = '';
        pciError.textContent = '';

        const siteValue = inputSite.value.trim();
        const pciValue = inputPCI.value.trim();
        
        const isSiteFilled = siteValue.length > 0;
        const isPciFilled = pciValue.length > 0;
        
        // 1. Validação de Exclusividade (Apenas um campo deve estar preenchido)
        if (!isSiteFilled && !isPciFilled) {
             siteError.textContent = 'Preencha o campo Site ou o campo PCI para pesquisar.';
             pciError.textContent = 'Preencha o campo Site ou o campo PCI para pesquisar.';
             return;
        }
        
        // 2. Validações de Formato e Existência

        if (isSiteFilled) {
            if (siteValue.length !== 7 || !/^[A-Z0-9]{7}$/.test(siteValue)) {
                siteError.textContent = 'O campo Site deve ter exatamente 7 caracteres (letras e números).';
                return;
            }
            // Valida se o Site existe na coluna 'site'
            if (!siteColumnValues.has(siteValue)) {
                siteError.textContent = `O Site "${siteValue}" não existe na base de dados.`;
                return;
            }

        } else if (isPciFilled) {
            if (pciValue.length === 0 || pciValue.length > 3 || !/^[0-9]+$/.test(pciValue)) {
                 pciError.textContent = 'O campo PCI deve ter de 1 a 3 dígitos numéricos.';
                 return;
            }
            // Valida se o PCI existe na coluna 'pci'
            if (!allData.some(item => item.pci === pciValue)) {
                pciError.textContent = `O PCI "${pciValue}" não existe na base de dados.`;
                return;
            }
        }
        
        // 3. Filtragem
        let filteredData = [];

        if (isSiteFilled) {
            filteredData = allData.filter(item => item.site === siteValue);
        } else if (isPciFilled) {
            filteredData = allData.filter(item => item.pci === pciValue);
        }

        // 4. Exibe os Resultados
        if (filteredData.length > 0) {
            renderTable(filteredData);
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.classList.remove('hidden');
            noResultsMessage.classList.remove('hidden');
        }
    });

    // --- Lógica de Renderização da Tabela ---
    function renderTable(data) {
        data.forEach(item => {
            const row = dataTableBody.insertRow();
            
            // Destaque para 5G
            if (item.rede.includes('5G')) {
                row.classList.add('row-5g');
            }

            // Inserção dos dados na ordem: site, pci, setor, rede
            row.insertCell().textContent = item.site;
            row.insertCell().textContent = item.pci;
            row.insertCell().textContent = item.setor;
            row.insertCell().textContent = item.rede;
        });
    }

    // Inicia o carregamento dos dados quando a página estiver pronta
    loadCSV();
});