import React, { useState } from 'react';
import { useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css";
import axios from 'axios';
import { Modal, Button } from "react-bootstrap";
import PrivacyPolicy from './PrivacyPolicy';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home'); // начальная страница — home

  const [state, setState] = useState({
    json: [],
    shop: [],
    sourceList: ['Авито', 'HH.ru', 'От знакомого', 'Объявление на магазине', 'VK'],
    res: ""
  });

  const [details, setDetails] = useState({
    tittle: "Заявка по вакансии через бота.",
    name: "",
    phone: "",
    shop: "",
    job: "",
    schedule: "",
    desiredSchedule: "",
    source: "",
    preferredContactMethod: "",
    email: "",
    comment: "",
    });

  const [isLoading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false); // Состояние для чекбокса

  const handleClose = () => {
    setShowModal(false);
    // location.reload(); // Если хотите перезагрузить страницу после закрытия модального окна
  };

  const loadStr = async () => {
    document.getElementById("loaded").style.visibility = "hidden";

    // Загружаем и сортируем JSON (по ебаному все выгружается, не забыть дать пизды 1Серам)
    await fetch('./data.json')
      .then(response => response.json())
      .then(jsonData => {
        state.json = jsonData['Результат'].sort((a, b) => {
          if (a.Наименование < b.Наименование) return -1;
          if (a.Наименование > b.Наименование) return 1;
          return 0;
        });
      });

    // Заполняем список магазинов(дать пизды 1Серам чтоб не выгружались закрытые магазины)
    state.json.forEach(function(el) {
      let newOption = new Option(el.Наименование, el.КодМагазина);
      shopList.append(newOption);
    });

    document.getElementById('sourceList').innerHTML = "<option value=\"DEFAULT\" selected>...</option>";
    for (let item of state.sourceList) {
      let newOption = new Option(item);
      sourceList.append(newOption);
    }

    // Делаем форму видимой и прячем загрузку
    setLoading(false);
    document.getElementById("loaded").style.visibility = "visible";

    // Заполнение списка должностей при изменении магазина
    document.getElementById("shopList").addEventListener('change', function(e) {
      for (let value of Object.values(state.json)) {
        if (e.target.value === value['КодМагазина']) {
          state.shop = value;

          document.getElementById('jobList').innerHTML = "<option value=\"DEFAULT\" selected>...</option>";
          document.getElementById('scheduleList').innerHTML = "<option value=\"DEFAULT\" selected>...</option>";

          for (let item of state.shop['Должность']) {
            let newOption = new Option(item['Наименование']);
            jobList.append(newOption);
          }
        }
      }
    });

    // Заполнение графика работ при изменении должности(дать пизды 1Серам чтоб поправили графики)
    document.getElementById("jobList").addEventListener('change', function(e) {
      document.getElementById('scheduleList').innerHTML = "<option value=\"DEFAULT\" selected>...</option>";
      for (let value of Object.values(state.shop['Должность'])) {
        if (e.target.value === value['Наименование']) {
          for (let item of value['ВозможныеГрафики']) {
            let newOption = new Option(item);
            scheduleList.append(newOption);
          }
        }
      }
    });
  };

  const handleDetailsChange = (event) => {
    const { name, value } = event.target;

    if (name === 'file') {
      setDetails(prevDetails => ({
        ...prevDetails,
        [name]: event.target.files[0]
      }));
    } else {
      setDetails(prevDetails => ({
        ...prevDetails,
        [name]: value
      }));
    }
  };

  const handleAcceptTerms = (event) => {
    setTermsAccepted(event.target.checked);
  };

  const handleSendEmail = async () => {
    if (!termsAccepted) {
      alert("Вы должны согласиться с условиями обработки персональных данных.");
      return;
    }
  
    // Логирование данных перед отправкой
    console.log("Отправляемые данные: ", details);
    
    const postData = {
      tittle: details.tittle,
      to: state.shop['ПочтаМагазина'],
                      body: `<p>Фио: ${details.name};</p>
                             <p>Телефон: +7${details.phone};</p>
                             <p>Магазин: ${state.shop['Наименование']};</p>
                             <p>Должность: ${details.job};</p>
                             <p>График работы: ${details.schedule};</p>
                             <p>Желаемый график работы: ${details.desiredSchedule};</p>
                             <p>Источник: ${details.source};</p>
                             <p>Предпочтительный способ связи: ${details.preferredContactMethod};</p>
                             <p>Email: ${details.email};</p>
                             <p>Комментарий: ${details.comment};</p>`
    };

    try {
      await axios.post('/send', null, { params: postData }).then(function(response) {
        state.res = response.request.response;
      });
  
      // Очищаем форму после успешной отправки
      setDetails({
        tittle: "Заявка по вакансии через бота.",
        name: "",
    phone: "",
    shop: "",
    job: "",
    schedule: "",
    desiredSchedule: "",
    source: "",
    preferredContactMethod: "",
    email: "",
    comment: "",
        file: null
      });
  
      setShowModal(true); // Показываем модальное окно с подтверждением
    } catch (error) {
      console.error('Ошибка при отправке заявки:', error);
    }
  };

  useEffect(() => {
    loadStr();
  }, []);

  return (
    <div>
      {currentPage === 'home' &&
        <Home
          details={details}
          setDetails={setDetails}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          handleSendEmail={handleSendEmail}
          showModal={showModal}
          setShowModal={setShowModal}
          handleClose={handleClose}
          isLoading={isLoading}
          setCurrentPage={setCurrentPage}
        />
      }
      {currentPage === 'privacy-policy' &&
        <PrivacyPolicy />
      }
    </div>
  );
};

// Компонент Home, который содержит всю логику главной страницы
const Home = ({
  details,
  setDetails,
  termsAccepted,
  setTermsAccepted,
  handleSendEmail,
  showModal,
  handleClose,
  isLoading,
  setCurrentPage
}) => {
  return (
    <>
      <img src="logo.jpg" className="img-fluid" alt="Логотип" />

      <hr />

      {
        isLoading ?
          <div className="text-center" id="loading">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Загрузка...</span>
            </div>
          </div>
          :
          null
      }

<div id="loaded" className="rp">
        
        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">ФИО*</span>
          <input type="text" className="form-control rpole" maxLength="255" placeholder="Фамилия Имя Отчество" aria-label="username" id="username" aria-describedby="basic-addon1" name="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
        </div>

        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">Телефон*</span>
          <span className="input-group-text" id="basic-addon1">+7</span>
          <input type="text" className="form-control rpole" maxLength="10" aria-label="phone" id="phone" aria-describedby="basic-addon1" name="phone" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
        </div>

        <div className="input-group mb-3">
          <label className="input-group-text" htmlFor="shopList">Магазин*</label>
          <select className="form-select rpole" id="shopList" name="shop" value={details.shop} onChange={(e) => setDetails({ ...details, shop: e.target.value })}>
            <option value="" key="default" hidden>Выберите магазин</option>
          </select>
        </div>

        <div className="input-group mb-3">
          <label className="input-group-text" htmlFor="jobList">Должность*</label>
          <select className="form-select rpole" id="jobList" name="job" value={details.job} onChange={(e) => setDetails({ ...details, job: e.target.value })} />
        </div>

        <div className="input-group mb-3">
          <label className="input-group-text" htmlFor="scheduleList">График работы*</label>
          <select className="form-select rpole" id="scheduleList" name="schedule" value={details.schedule} onChange={(e) => setDetails({ ...details, schedule: e.target.value })} />
        </div>

        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">Желаемый график работы</span>
          <input type="text" className="form-control rpole" maxLength="255" placeholder="Желаемый график работы" aria-label="desiredSchedule" id="desiredSchedule" aria-describedby="basic-addon1" name="desiredSchedule" value={details.desiredSchedule} onChange={(e) => setDetails({ ...details, desiredSchedule: e.target.value })} />
        </div>

        <div className="input-group mb-3">
          <label className="input-group-text" htmlFor="sourceList">Откуда вы пришли?*</label>
          <select className="form-select rpole" id="sourceList" name="source" value={details.source} onChange={(e) => setDetails({ ...details, source: e.target.value })} />
        </div>

        <div className="input-group mb-3">
          <label className="input-group-text" htmlFor="preferredContactMethod">Предпочтительный способ связи:</label>
          <select className="form-select rpole" id="preferredContactMethod" name="preferredContactMethod" value={details.preferredContactMethod} onChange={(e) => setDetails({ ...details, preferredContactMethod: e.target.value })}>
            <option value="Телефон">Телефон</option>
            <option value="Telegram">Telegram</option>
            <option value="Viber">Viber</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="E-mail">E-mail</option>
          </select>
        </div>

        {
          details.preferredContactMethod === 'E-mail' &&
          <div className="input-group mb-3">
            <span className="input-group-text" id="emailLabel">E-mail:</span>
            <input type="email" className="form-control rpole" placeholder="Введите ваш E-mail" aria-label="email" id="emailInput" name="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
          </div>
        }

                <div className="input-group">
          <span className="input-group-text">Комментарий</span>
          <textarea className="form-control" maxLength="255" name="comment" value={details.comment} onChange={(e) => setDetails({ ...details, comment: e.target.value })} />
        </div>

        <div className="form-check mb-3">
  <input className="form-check-input" type="checkbox" id="termsCheckbox" checked={termsAccepted} onChange={() => setTermsAccepted(!termsAccepted)} required />
  <label className="form-check-label" htmlFor="termsCheckbox">Я согласен с условиями обработки персональных данных.</label>
  <br />
  <a href="#" onClick={() => setCurrentPage('privacy-policy')}>Политика конфиденциальности</a>
</div>
        <hr />

        <button type="button" className="btn btn-primary" id="buttonSend" data-bs-toggle="modal" data-bs-target="#exampleModal"
          disabled={
            !details.name ||
            !details.phone ||
            !details.shop ||
            !details.job ||
            !details.schedule ||
            !details.source ||
            !termsAccepted
          }
          onClick={handleSendEmail}
        >
          Отправить заявку
        </button>

      </div>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Успешная отправка!</Modal.Title>
        </Modal.Header>
        <Modal.Body>Ваше сообщение было успешно отправлено.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>Закрыть</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default App;