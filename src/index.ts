interface Info {
    name: string;
    values?: string | string[];
    class: string;
}

interface OptionsInput {
    uuid?: string;
    classes: string[];
    label: string;
    name: string;
    type: string;
}

interface Row {
    id: string;
    value: string;
}

interface OptionsSelect {
    uuid?: string;
    classes: string[];
    label: string;
    name: string;
    option?: string;
    multiple?: boolean;
    query?: OptionsQuery;
    values?: string | string[];
}

interface OptionsQuery {
    url: string;
    method: string;
    body?: object;
    params?: Record<string, any>;
}

interface IEntry {
    id: string;
    fio: string;
    procedure: string;
    hardness: string;
}

type IItemOptions = IEntry;

interface ICard {
    id: string;
    date: string;
    procedures: string[];
    entries: string[];
}

function toggleModal() {
    const modal = document.querySelector('.modal')!;
    if (modal.classList.toggle('hidden')) {
        const content = modal.querySelector('.content');
        content!.innerHTML = '';

        const approveBtn = modal.querySelector('#approve');
        approveBtn!.remove();
    }
}

async function query(url: string, method: string, body?: object, query?: Record<string, any>) {
    const req = await fetch(url + (query ? `?${new URLSearchParams(query).toString()}` : ''), {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!req.ok) {
        throw new Error(await req.text());
    }
    return req
}

function emptyString(str: string | undefined) {
    return str && str.length > 0;
}

function addInfo(element: Element, options: Info) {
    element.classList.add(options.class);

    let pElem = element.appendChild(document.createElement('p'));
    pElem.innerText = options.name;
    pElem.classList.add('title');

    pElem = element.appendChild(document.createElement('p'));
    if (typeof options.values === 'string') {
        pElem.innerText = options.values;
    } else if (Array.isArray(options.values)) {
        for (const value of options.values) {
            pElem.innerHTML += value + '<br>'
        }
    }

    return pElem;
}

function addInput(element: Element, options: OptionsInput) {
    const container = document.createElement('div');
    container.classList.add(...options.classes);

    const label = document.createElement('label');
    label.htmlFor = options.label + options.uuid;
    label.innerText = options.name;

    const input = document.createElement('input');
    input.type = options.type;
    input.id = options.label + options.uuid;

    container.appendChild(label);
    container.appendChild(input);
    element.appendChild(container);

    return input;
}

function addSelect(element: Element, options: OptionsSelect) {
    const container = document.createElement('div');
    container.classList.add(...options.classes);

    const label = document.createElement('label');
    label.htmlFor = options.label + options.uuid;
    label.innerText = options.name;

    const select = document.createElement('select');
    select.id = options.label + options.uuid;
    if (options.multiple) {
        select.multiple = options.multiple
    }

    if (options.option) {
        const mainOption = document.createElement('option');
        mainOption.innerText = options.option;
        mainOption.disabled = true;
        select.appendChild(mainOption);
    }

    container.appendChild(label);
    container.appendChild(select);
    element.appendChild(container);

    return select;
}

async function addSelectSql(element: Element, options: OptionsSelect) {
    const select = addSelect(element, options);

    const result = await query(options.query!.url, options.query!.method, options.query!.body, options.query!.params);

    const rows: Row[] = await result.json();
    for (const row of rows) {
        const option = document.createElement('option');
        option.innerText = row.value;
        option.value = row.id;
        select.appendChild(option);
        if (typeof options.values === 'string') {
            if (row.id === options.values) {
                select.value = row.id;
            }
        } else if (Array.isArray(options.values)) {
            if (options.values!.includes(row.id)) {
                option.selected = true;
            }
        }
    }

    return select;
}

async function addItems(li: Element, listCont: Element, entryIds: string[] | undefined) {
    if (entryIds && entryIds.length > 0) {
        let result: Response | any;
        let row: IEntry[];
        for (const entryId of entryIds) {
            result = await query('entry', 'GET', undefined, {id: entryId})
            row = await result.json();
            result = await query('procedure', 'GET', undefined, {id: row[0].procedure});
            result = await result.json();
            row[0].procedure = result[0].value;
            row[0].hardness = result[0].hardness;

            addItem(li, listCont, row[0]);
        }
    }
}

function validateHardness(card: Element) {
    return +card.getAttribute('total-hardness')! < 20;
}

function addItem(card: Element, listCont: Element, options?: IItemOptions) {
    const listItem = document.createElement('div');
    listItem.classList.add('list-item');
    listItem.setAttribute('edited', 'false');
    if (!options) {
        listItem.classList.add('editable');
    } else {
        listItem.id = options.id;
        listItem.setAttribute('hardness', options?.hardness);
    }

    const id = options ? options.id : crypto.randomUUID();
    const itemId = listItem.appendChild(document.createElement('div'));
    itemId.classList.add('item-id');
    itemId.innerHTML = `<p class="title">ID: ${id}</p>`;

    const fioCont = listItem.appendChild(document.createElement('div'));
    fioCont.classList.add('item-name');
    fioCont.innerHTML = '<p class="title">ФИО:</p>';

    const fioInput = addInput(fioCont, {
        uuid: id,
        classes: ['inp'],
        label: 'fio',
        name: '',
        type: 'text'
    });
    fioInput.addEventListener('change', () => {
        listItem.setAttribute('edited', 'true');
    });

    const fioP = fioCont.appendChild(document.createElement('p'));
    if (options && options.fio) {
        fioP.innerText = options.fio;
        fioInput.value = options.fio;
    }
    fioP.setAttribute('value', fioInput.value);

    const procedureCont = listItem.appendChild(document.createElement('div'));
    procedureCont.classList.add('item-type');
    procedureCont.innerHTML = '<p class="title">Процедура:</p>';

    const procedureSelect = addSelect(procedureCont, {
        uuid: id,
        classes: ['inp'],
        label: 'type',
        name: ''
    });
    procedureSelect.addEventListener('change', () => {
        listItem.setAttribute('edited', 'true');
    });
    Array.from((card.querySelector('.card-procedures select')! as HTMLSelectElement).selectedOptions)
        .forEach(option => {
            const newOption = document.createElement('option');
            newOption.value = option.value;
            newOption.innerText = option.innerText;
            procedureSelect.appendChild(newOption);
            if (options && newOption.innerText === options.procedure) {
                newOption.selected = true;
            }
        });

    const procedureP = procedureCont.appendChild(document.createElement('p'));
    if (options && options.procedure) {
        procedureP.innerText = options.procedure;
    }
    procedureP.setAttribute('value', procedureSelect.value);

    const buttons = listItem.appendChild(document.createElement('div'));
    buttons.classList.add('item-buttons');

    const edit = buttons.appendChild(document.createElement('img')) as HTMLImageElement;
    edit.src = "../assets/edit.svg";
    edit.alt = "Edit";
    edit.addEventListener('click', () => {
        fioInput.value = fioP.getAttribute('value')!;
        procedureSelect.value = procedureP.getAttribute('value')!;

        listItem.classList.add('editable');

        edit.classList.toggle('hidden');
        ddelete.classList.toggle('hidden');
        approve.classList.toggle('hidden');
        cancel.classList.toggle('hidden');
    });

    const ddelete = buttons.appendChild(document.createElement('img'));
    ddelete.src = "../assets/delete-button.svg";
    ddelete.alt = "Delete";
    ddelete.addEventListener('click', async () => {
        const uuid = listItem.parentElement!.parentElement!.parentElement!.id;
        await query('shift', 'POST', {
            itemId: id,
            remove: true,
            entry: {
                remove: true
            }
        }, {
            id: uuid,
            entryId: id
        });

        const card = listItem.parentElement!.parentElement!.parentElement!;
        card.setAttribute('total-hardness', (+card.getAttribute('total-hardness')! - +listItem.getAttribute('hardness')!).toString());
        (card.querySelector('.total-hardness')! as HTMLElement).innerText = card.getAttribute('total-hardness')!;

        listItem.remove();
    });

    const approve = buttons.appendChild(document.createElement('img'));
    approve.src = "../assets/confirm.svg";
    approve.alt = "Approve";
    approve.addEventListener('click', async () => {
        if (!emptyString(fioInput.value)) {
            alert('Следует заполнить все поля');
            return;
        }

        const result = await query('procedure', 'GET', undefined, {id: procedureSelect.value});
        const newHardness = +(await result.json())[0].hardness;

        if (listItem.getAttribute('edited') === 'true') {
            const uuid = listCont.parentElement!.parentElement!.id;

            if (listItem.id) {
                await query('entry', 'POST', {
                    fio: fioInput.value,
                    procedure: procedureSelect.value
                }, {
                    id: id,
                });
                card.setAttribute('total-hardness', (+card.getAttribute('total-hardness')! + newHardness - +listItem.getAttribute('hardness')!).toString());
            } else {
                if (!validateHardness(card)) {
                    alert('Превышена суммарная сложность смены.');
                    return;
                }
                await query('shift', 'POST', {
                    itemId: id,
                    entry: {
                        id: id,
                        fio: fioInput.value,
                        procedure: procedureSelect.value
                    }
                }, {
                    id: uuid,
                    entryId: id
                });


                card.setAttribute('total-hardness', (+card.getAttribute('total-hardness')! + newHardness).toString());
            }

            fioP.innerText = fioInput.value;
            procedureP.innerText = procedureSelect.options[procedureSelect.selectedIndex].text;

            fioP.setAttribute('value', fioInput.value);
            procedureP.setAttribute('value', procedureSelect.value);

            listItem.id = id;
            enableDragAndDropListItem(listItem);
        }

        listItem.classList.remove('editable');
        listItem.setAttribute('edited', 'false');

        (card.querySelector('.total-hardness')! as HTMLElement).innerText = card.getAttribute('total-hardness')!;
        listItem.setAttribute('hardness', newHardness.toString());

        edit.classList.toggle('hidden');
        ddelete.classList.toggle('hidden');
        approve.classList.toggle('hidden');
        cancel.classList.toggle('hidden');
    });

    const cancel = buttons.appendChild(document.createElement('img')) as HTMLImageElement;
    cancel.src = "../assets/delete.svg";
    cancel.alt = "Cancel";
    cancel.addEventListener('click', () => {
        if (listItem.id) {
            listItem.classList.remove('editable');

            fioInput.value = fioP.getAttribute('value')!;
            procedureSelect.value = procedureP.getAttribute('value')!;


            edit.classList.toggle('hidden');
            ddelete.classList.toggle('hidden');
            approve.classList.toggle('hidden');
            cancel.classList.toggle('hidden');
        } else {
            listItem.remove();
        }
    });

    if (options) {
        approve.classList.add('hidden');
        cancel.classList.add('hidden');
        card.setAttribute('total-hardness', (+card.getAttribute('total-hardness')! + +listItem.getAttribute('hardness')!).toString());
    } else {
        edit.classList.add('hidden');
        ddelete.classList.add('hidden');
    }

    listCont.appendChild(listItem);
}

async function createListElement(options: ICard) {
    const list = document.querySelector('.cards-list');

    const liElem = document.createElement('li');
    liElem.classList.add('card');
    liElem.id = options.id
    liElem.setAttribute('total-hardness', '0');

    const id = document.createElement('div');
    id.innerText = `ID: ${options.id}`;
    liElem.appendChild(id);

    const mainInfo = document.createElement('div');
    mainInfo.classList.add('main-info');

    let p = mainInfo.appendChild(document.createElement('p'));
    p.innerText = 'Основная информация';

    const buttons = document.createElement('div');
    buttons.classList.add('buttons');

    mainInfo.appendChild(buttons);

    liElem.appendChild(mainInfo);

    const information = document.createElement('div');
    information.classList.add('info');
    information.setAttribute('edited', 'false');

    const dateCont = document.createElement('div');
    const dateP = addInfo(dateCont, {
        name: 'Дата',
        values: options.date.slice(0, 10),
        class: 'card-date'
    });
    const dateInput = addInput(dateCont, {
        uuid: options.id,
        classes: ['inp'],
        label: 'date',
        name: '',
        type: 'date'
    });
    dateInput.value = options.date.slice(0, 10);
    dateP.setAttribute('value', dateInput.value);
    dateInput.addEventListener('change', () => {
        information.setAttribute('edited', 'true');
    })
    information.appendChild(dateCont);

    const proceduresCont = document.createElement('div');
    const proceduresP = addInfo(proceduresCont, {
        name: 'Процедуры',
        class: 'card-procedures'
    });
    const proceduresSelect = await addSelectSql(proceduresCont!, {
        uuid: options.id,
        classes: ['inp'],
        label: 'procedures',
        name: '',
        multiple: true,
        query: {
            url: '/procedure',
            method: 'GET'
        },
        values: options.procedures
    });
    const proceduresTextArray: string[] = [];
    Array.from(proceduresSelect.selectedOptions).forEach(option => {
        proceduresTextArray.push(option.text);
    });
    proceduresTextArray.forEach(text => {
        proceduresP.innerHTML += text + '<br>';
    })
    proceduresP.setAttribute('value', options.procedures.join(','));
    proceduresSelect.addEventListener('change', () => {
        information.setAttribute('edited', 'true');
    })

    information.appendChild(proceduresCont);

    const maxHardness = document.createElement('div');

    p = maxHardness.appendChild(document.createElement('p'));
    p.classList.add('title');
    p.innerText = 'Максимальная сложность смены';

    p = maxHardness.appendChild(document.createElement('p'));
    p.innerText = '20';

    information.appendChild(maxHardness);

    const totalHardness = document.createElement('div');

    p = totalHardness.appendChild(document.createElement('p'));
    p.classList.add('title');
    p.innerText = 'Общая сложность смены';

    p = totalHardness.appendChild(document.createElement('p'));
    p.classList.add('total-hardness');

    information.appendChild(totalHardness);

    liElem.appendChild(information);

    const cardList = liElem.appendChild(document.createElement('div'));
    cardList.classList.add('card-list');

    const cardListP = cardList.appendChild(document.createElement('p'));
    cardListP.innerHTML = 'Список приемов:';

    const listCont = cardList.appendChild(document.createElement('div'));
    listCont.classList.add('list-cont');

    const edit = buttons.appendChild(document.createElement('img'));
    edit.src = '../assets/edit.svg';
    edit.alt = 'edit';
    edit.addEventListener('click', () => {
        information.classList.toggle('editable');

        edit.classList.toggle('hidden');
        approve.classList.toggle('hidden');
        cancel.classList.toggle('hidden');
    });

    const approve = buttons.appendChild(document.createElement('img'));
    approve.src = '../assets/confirm.svg';
    approve.alt = 'edit';
    approve.classList.add('hidden');
    approve.addEventListener('click', async () => {
        if (information.getAttribute('edited') === 'true') {
            if (dateInput.value === '') {
                alert('Дата должна быть заполнена');
                return;
            }
            const procedures: string[] = [];
            Array.from(proceduresSelect.selectedOptions).forEach(option => procedures.push(option.value));
            const items = liElem.querySelectorAll('.list-item .item-type p:not(.title)');
            for (const item of items) {
                if (!procedures.includes(item.getAttribute('value')!)) {
                    alert('Невозможно изменить, так как присутствуют приемы с удаляемыми процедурами');
                    return;
                }
            }
            await query('shift', 'POST', {
                date: dateInput.value,
                procedures: procedures.map(procedure => `'${procedure}'`).join(', ')
            }, {
                id: options.id
            });

            dateP.innerText = dateInput.value;
            proceduresP.innerHTML = '';
            Array.from(proceduresSelect.selectedOptions).forEach(option => proceduresP.innerHTML += option.innerText + '<br>');

            dateP.setAttribute('value', dateInput.value);
            proceduresP.setAttribute('value', proceduresSelect.value);
        }

        information.setAttribute('edited', 'false');
        information.classList.toggle('editable');

        edit.classList.toggle('hidden');
        approve.classList.toggle('hidden');
        cancel.classList.toggle('hidden');
    })

    const cancel = buttons.appendChild(document.createElement('img'));
    cancel.src = '../assets/delete.svg';
    cancel.alt = 'edit';
    cancel.classList.add('hidden');
    cancel.addEventListener('click', () => {
        information.classList.toggle('editable');

        if (information.getAttribute('edited') === 'true') {
            dateInput.value = dateP.getAttribute('value')!;
            const procedures = proceduresP.getAttribute('value')!.split(',');
            Array.from(proceduresSelect.options).forEach(option => {
                option.selected = procedures.includes(option.value);
            });
        }

        edit.classList.toggle('hidden');
        approve.classList.toggle('hidden');
        cancel.classList.toggle('hidden');
    });

    const add = liElem.appendChild(document.createElement('button'));
    add.classList.add('add-card-btn');
    add.innerText = 'Добавить прием';
    add.addEventListener('click', () => {
        addItem(liElem, listCont);
    });

    const ddelete = liElem.appendChild(document.createElement('button'));
    ddelete.classList.add('delete-card-btn');
    ddelete.innerText = 'Удалить карточку';
    ddelete.addEventListener('click', async () => {
        await query('shift', 'DELETE', undefined, {id: liElem.id});

        liElem.remove();
    });

    await addItems(liElem, listCont, options.entries);

    (liElem.querySelector('.total-hardness')! as HTMLElement).innerText = liElem.getAttribute('total-hardness')!;

    list!.insertBefore(liElem, list!.lastElementChild);

    return liElem;
}

async function addListElement() {
    const modal = document.querySelector('.modal');
    if (modal) {
        const content = modal.querySelector('.content');

        const dateInput = addInput(content!, {
            classes: ['title'],
            label: 'city',
            name: 'Дата смены',
            type: 'date'
        });

        const proceduresSelect = await addSelectSql(content!, {
            classes: ['title'],
            label: 'procedures',
            name: 'Процедуры',
            option: 'Название',
            multiple: true,
            query: {
                url: '/procedure',
                method: 'GET'
            },
        });

        async function createNewListElement() {
            const uuid = crypto.randomUUID();

            const procedures: string[] = [];
            Array.from(proceduresSelect.selectedOptions).forEach((option) => {
                procedures.push(option.value);
            })
            if (dateInput.value === '') {
                alert('Дата должна быть заполнена');
                return false;
            }
            await query('/shift', 'PUT', {
                id: uuid,
                date: dateInput.value,
                procedures: procedures.map(procedure => `'${procedure}'`).join(', '),
            });

            const li = await createListElement({
                id: uuid,
                date: dateInput.value,
                procedures: procedures,
                entries: []
            })

            enableDragAndDropCard(li)
            return true;
        }

        const modalButtons = modal.querySelector('.modal-buttons');

        const approveBtn = document.createElement('img');
        approveBtn.src = '../assets/confirm.svg';
        approveBtn.alt = 'Approve';
        approveBtn.id = 'approve';
        approveBtn.addEventListener('click', async () => {
            try {
                if (await createNewListElement())
                    toggleModal();
            } catch (e: any) {
                window.alert(e.message);
            }
        });
        modalButtons!.insertBefore(approveBtn, modalButtons!.firstChild);

        toggleModal();
    }
}

function enableDragAndDropCard(card: HTMLElement) {
    card.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
    });

    card.addEventListener('drop', async (e: DragEvent) => {
        e.preventDefault();
        card.classList.remove('drag-over');

        const data = e.dataTransfer?.getData('text/plain');
        if (!data) return;

        const {itemId} = JSON.parse(data);
        const item = document.getElementById(itemId)!;
        const draggedItem = document.getElementById(itemId)!;
        const targetList = card.querySelector<HTMLElement>('.list-cont')!;

        const cardId = card.id;

        if (!cardId) return;

        if (!validateHardness(card)) {
            alert('Превышена суммарная сложность смены.');
            return;
        }
        const proceduresTextArray: string[] = [];
        Array.from((card.querySelector('.card-procedures .inp select')! as HTMLSelectElement).selectedOptions).forEach(option => {
            proceduresTextArray.push(option.value);
        });

        if (!proceduresTextArray.includes(item.querySelector('.item-type p:not(.title)')!.getAttribute('value')!)) {
            alert('Невозможно добавить данную процедуру в смену.');
            return;
        }

        if (!targetList.querySelector('.list-item')) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('list-item-placeholder');
            targetList.appendChild(placeholder);
        }

        const sourceCard = draggedItem.closest('.card');
        const sourceCardId = sourceCard?.id;
        if (sourceCardId) {
            await query('/shift', 'POST', {
                itemId,
                remove: true
            }, {
                id: sourceCardId
            });
        }

        await query('/shift', 'POST', {
            itemId,
        }, {
            id: cardId
        });

        targetList.appendChild(draggedItem);

        const placeholder = targetList.querySelector('.list-item-placeholder');
        if (placeholder) placeholder.remove();

        sourceCard!.setAttribute('total-hardness', (+sourceCard!.getAttribute('total-hardness')! - +item.getAttribute('hardness')!).toString());
        card!.setAttribute('total-hardness', (+card!.getAttribute('total-hardness')! + +item.getAttribute('hardness')!).toString());
        (card.querySelector('.total-hardness')! as HTMLElement).innerText = card.getAttribute('total-hardness')!;
        (sourceCard!.querySelector('.total-hardness')! as HTMLElement).innerText = sourceCard!.getAttribute('total-hardness')!;
    });
}

function enableDragAndDropListItem(item: HTMLElement) {
    item.draggable = true;
    item.addEventListener('dragstart', (e: DragEvent) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                itemId: item.id
            }));
        }
        item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
    });
}

function enableDragAndDrop() {
    const listItems = document.querySelectorAll<HTMLElement>('.list-item');
    listItems.forEach(enableDragAndDropListItem);

    const cards = document.querySelectorAll<HTMLElement>('.card');
    cards.forEach(enableDragAndDropCard);
}

async function createProcedure() {
    const modal = document.querySelector('.modal');
    if (modal) {
        const content = modal.querySelector('.content');

        const id = crypto.randomUUID();
        const idCont = document.createElement('div');
        idCont.innerHTML = `<p>ID: ${id}</p>`;
        content!.appendChild(idCont);

        const nameCont = document.createElement('div');
        const nameInput = addInput(nameCont, {
            classes: [],
            label: 'name',
            name: 'Название',
            type: 'text'
        });
        content!.appendChild(nameCont);

        const hardnessCont = document.createElement('div');
        const hardnessInput = addInput(nameCont, {
            classes: [],
            label: 'name',
            name: 'Сложность',
            type: 'number'
        });
        content!.appendChild(hardnessCont);

        const modalButtons = modal.querySelector('.modal-buttons');
        const approveBtn = document.createElement('img');
        approveBtn.src = '../assets/confirm.svg';
        approveBtn.alt = 'Approve';
        approveBtn.id = 'approve';
        approveBtn.addEventListener('click', async () => {
            if (!emptyString(nameInput.value)) {
                alert(`Не заполнено поле ${nameInput.labels![0].innerText}`)
                return;
            }
            await query('procedure', 'PUT', {
                id: id,
                value: nameInput.value,
                hardness: hardnessInput.value
            });

            const proceduresSelects = document.querySelectorAll(`[id^='procedure']:not(.modal div)`);
            proceduresSelects.forEach(citySelect => {
                const option = document.createElement('option');
                option.value = id;
                option.innerText = nameInput.value;

                citySelect.appendChild(option);
            });

            toggleModal();
        });
        modalButtons!.insertBefore(approveBtn, modalButtons!.firstChild);

        toggleModal();
    }
}

async function init() {
    const result = await query('shift', 'GET');
    const rows: ICard[] = await result.json();
    for (const row of rows) {
        row.date = (new Date((new Date(row.date)).getTime() + 3 * 60 * 60 * 1000)).toISOString();
        await createListElement(row);
    }

    enableDragAndDrop();
}
