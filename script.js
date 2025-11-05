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
    let siteColumnValues = new Set(); 

    // Função para carregar e processar o CSV
    async function loadCSV() {
        try {
            const response = await fetch('dataBase.csv');
            if (!response.ok) {
                throw new Error('Erro ao carregar o arquivo dataBase.csv');
            }
            const text = await response.text();
            
            const lines = text.trim().split('\n');
            const dataLines = lines.slice(1); 
            
            allData = dataLines.map(line => {
                const [siteRaw, pci, setor, rede] = line.split(';');
                
                const cleanedSite = siteRaw ? siteRaw.trim().toUpperCase().slice(0, 7).replace(/[^A-Z0-9]/g, '') : '';
                
                if (cleanedSite && cleanedSite.length === 7) {
                    siteColumnValues.add(cleanedSite);
                }

                return {
                    site: cleanedSite,
                    pci: pci ? pci.trim() : '',
                    setor: setor ? setor.trim() : '',
                    rede: rede ? rede.trim().toUpperCase() : ''
                };
            }).filter(item => item.site.length === 7); 
            
            console.log(`CSV carregado. Total de ${allData.length} registros válidos.`);

        } catch (error) {
            console.error('Falha ao carregar ou processar o CSV:', error);
            alert('Não foi possível carregar os dados. Verifique o arquivo dataBase.csv).');
        }
    }

    function resetForm() {
        inputSite.value = '';
        inputPCI.value = '';
        inputSite.disabled = false; 
        inputPCI.disabled = false;  
        autocompleteList.innerHTML = '';
        
        inputSite.focus();
    }
    
    function clearErrors() {
        siteError.textContent = '';
        pciError.textContent = '';
    }

    inputSite.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.value = value;
        
        siteError.textContent = ''; 

        if (value.length > 0) {
            inputPCI.disabled = true;
            inputPCI.value = '';
            pciError.textContent = '';
        } else {
            inputPCI.disabled = false;
        }
        
        if (value.length >= 6) {
            showAutocomplete(value);
        } else {
            autocompleteList.innerHTML = ''; 
        }
    });

    inputPCI.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/[^0-9]/g, '');
        e.target.value = value;

        pciError.textContent = ''; 

        if (value.length > 0) {
            inputSite.disabled = true;
            inputSite.value = '';
            siteError.textContent = '';
            autocompleteList.innerHTML = '';
        } else {
            inputSite.disabled = false;
        }
    });

    function showAutocomplete(text) {
        if (text.length < 6) return;

        autocompleteList.innerHTML = '';
        
        let matchingSites = Array.from(siteColumnValues).filter(site => 
            site.startsWith(text)
        );
        
        matchingSites.sort();

        if (matchingSites.length > 0) {
            matchingSites.forEach(site => {
                const item = document.createElement('div');
                item.textContent = site;
                item.addEventListener('click', () => {
                    inputSite.value = site;
                    autocompleteList.innerHTML = '';
                    clearErrors(); 
                    inputPCI.disabled = true;
                    inputPCI.value = '';
                    searchForm.focus(); 
                });
                autocompleteList.appendChild(item);
            });
        }
    }
    
    document.addEventListener('click', (e) => {
        if (!autocompleteList.contains(e.target) && e.target !== inputSite) {
            autocompleteList.innerHTML = '';
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        dataTableBody.innerHTML = '';
        resultsContainer.classList.add('hidden');
        noResultsMessage.classList.add('hidden');
        clearErrors();

        const siteValue = inputSite.value.trim();
        const pciValue = inputPCI.value.trim();
        
        const isSiteFilled = siteValue.length > 0;
        const isPciFilled = pciValue.length > 0;
        
        let validationFailed = false;

        if (!isSiteFilled && !isPciFilled) {
             siteError.textContent = 'Preencha o campo Site ou o campo PCI para pesquisar.';
             pciError.textContent = 'Preencha o campo Site ou o campo PCI para pesquisar.';
             validationFailed = true;
        }
        
        if (!validationFailed && isSiteFilled) {
            if (siteValue.length !== 7 || !/^[A-Z0-9]{7}$/.test(siteValue)) {
                siteError.textContent = 'O campo Site deve ter exatamente 7 caracteres (letras e números).';
                validationFailed = true;
            }
            if (!validationFailed && !siteColumnValues.has(siteValue)) {
                siteError.textContent = `O Site "${siteValue}" não existe na base de dados.`;
                validationFailed = true;
            }
        } 
        
        else if (!validationFailed && isPciFilled) {
            if (pciValue.length === 0 || pciValue.length > 3 || !/^[0-9]+$/.test(pciValue)) {
                 pciError.textContent = 'O campo PCI deve ter de 1 a 3 dígitos numéricos.';
                 validationFailed = true;
            }
            if (!validationFailed && !allData.some(item => item.pci === pciValue)) {
                pciError.textContent = `O PCI "${pciValue}" não existe na base de dados.`;
                validationFailed = true;
            }
        }
        
        if (validationFailed) {
            return;
        }
        
        clearErrors();

        let filteredData = [];
        if (isSiteFilled) {
            filteredData = allData.filter(item => item.site === siteValue);
        } else if (isPciFilled) {
            filteredData = allData.filter(item => item.pci === pciValue);
        }

        if (filteredData.length > 0) {
            renderTable(filteredData);
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.classList.remove('hidden');
            noResultsMessage.classList.remove('hidden');
        }

        resetForm(); 
    });

    function renderTable(data) {
        data.forEach(item => {
            const row = dataTableBody.insertRow();
            
            if (item.rede.includes('5G')) {
                row.classList.add('row-5g');
            }

            row.insertCell().textContent = item.site;
            row.insertCell().textContent = item.pci;
            row.insertCell().textContent = item.setor;
            row.insertCell().textContent = item.rede;
        });
    }

    loadCSV();
});
