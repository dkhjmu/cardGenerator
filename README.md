# 카드 생성기 프로젝트

코틀린 스프링부트 백엔드와 리액트 프론트엔드로 구성된 웹 애플리케이션입니다.

## 기술 스택

### 백엔드
- Kotlin
- Spring Boot
- Spring Data JPA
- H2 Database

### 프론트엔드
- React
- React Router
- Axios

## 프로젝트 구조

```
cardGenerator/
├── src/                      # 백엔드 소스 디렉토리
│   ├── main/
│   │   ├── kotlin/          # 코틀린 소스 파일
│   │   │   └── com/example/cardgenerator/
│   │   │       ├── controller/   # REST 컨트롤러
│   │   │       ├── model/        # 데이터 모델 (엔티티)
│   │   │       ├── repository/   # 데이터 액세스 레이어
│   │   │       ├── service/      # 비즈니스 로직
│   │   │       └── CardGeneratorApplication.kt  # 메인 애플리케이션 클래스
│   │   └── resources/       # 리소스 파일
│   │       └── application.yml  # 스프링 설정 파일
│   └── test/                # 테스트 디렉토리
├── frontend/                # 프론트엔드 디렉토리
│   ├── public/              # 정적 파일
│   └── src/                 # 리액트 소스 파일
│       ├── components/      # 리액트 컴포넌트
│       ├── services/        # API 서비스
│       ├── App.js           # 앱 컴포넌트
│       └── index.js         # 진입점
└── build.gradle.kts         # Gradle 빌드 스크립트
```

## 실행 방법

### 백엔드 실행
```bash
./gradlew bootRun
```

### 프론트엔드 실행
```bash
cd frontend
npm install
npm start
```

## 기능

- 카드 생성, 조회, 수정, 삭제 (CRUD 기능)
- 반응형 UI
- RESTful API

## H2 데이터베이스 접근

백엔드가 실행 중일 때 다음 URL로 H2 콘솔에 접근할 수 있습니다:
```
http://localhost:8080/h2-console
```

- JDBC URL: `jdbc:h2:mem:carddb`
- 사용자명: `sa`
- 비밀번호: (비어 있음) 