document.addEventListener('DOMContentLoaded', function() {
    var toggleBtn = document.querySelector('.toggle-btn');
    var toggleContent = document.querySelector('.toggle-content');
    var checkboxes = document.querySelectorAll('.toggle-content input[type="checkbox"]');
    
    // Seçilen çözümleri saklamak için
    var selectedSolutionsContainer = document.createElement('div');
    selectedSolutionsContainer.className = 'selected-solutions';
    toggleBtn.insertAdjacentElement('afterend', selectedSolutionsContainer);

    toggleBtn.addEventListener('click', function(event) {
        event.stopPropagation();  // Menü açıkken butona tıklamanın menüyü kapatmamasını sağlar.
        toggleContent.style.display = toggleContent.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function(event) {
        // Toggle butonuna veya içerik alanına tıklanmadıysa menüyü kapat
        if (!toggleBtn.contains(event.target) && !toggleContent.contains(event.target)) {
            toggleContent.style.display = 'none';
        }
    });

    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            var selectedSolution = document.querySelector('.selected-solution[data-value="' + checkbox.value + '"]');

            if (checkbox.checked) {
                if (!selectedSolution) {
                    selectedSolution = document.createElement('div');
                    selectedSolution.className = 'selected-solution';
                    selectedSolution.dataset.value = checkbox.value;
                    selectedSolution.textContent = checkbox.parentNode.textContent.trim();
                    selectedSolutionsContainer.appendChild(selectedSolution);
                }
            } else if (selectedSolution) {
                selectedSolutionsContainer.removeChild(selectedSolution);
            }

            updateToggleBtnText();
        });
    });

    function updateToggleBtnText() {
        if (selectedSolutionsContainer.children.length > 0) {
            var selectedTexts = Array.from(selectedSolutionsContainer.children).map(function(el) {
                return el.textContent;
            }).join(', ');
            toggleBtn.textContent = 'Seçilenler: ' + selectedTexts;
        } else {
            toggleBtn.textContent = 'Seçin...';
        }
    }
});
