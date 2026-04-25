# JBY Schedule

손그림 느낌의 주간 스케줄 웹앱입니다. 왼쪽 자유 영역에서 박스를 만들고, 오른쪽 월~일 주간 보드에 드래그해서 일정을 배치할 수 있습니다.

## 주요 기능

- 자유 박스 생성, 이동, 색상/패턴/테두리 편집
- 오른쪽 주간 보드: 월~일, 날짜 표시, 6시~24시 시간축
- 스케줄 박스 드래그 이동 및 8방향 리사이즈
- 스케줄 박스 가로폭 1~7일 단위 스냅
- 더블클릭으로 박스 제목 편집
- Delete/Backspace로 선택 박스 삭제
- Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+D로 복사/붙여넣기/복제
- 브라우저 localStorage 자동 저장
- Chrome/Edge에서 폴더 선택 후 `YYYY-MM-DD.json` 파일 저장
- JSON 가져오기/내보내기

## 로컬 실행

```bash
python3 -m http.server 5173
```

브라우저에서 다음 주소를 엽니다.

```text
http://127.0.0.1:5173/
```

## 테스트

```bash
npm test
npm run check
```

## GitHub Pages 배포

1. GitHub repository를 만듭니다.
2. 이 프로젝트 파일을 push합니다.
3. GitHub repository에서 **Settings → Pages**로 이동합니다.
4. Source를 `Deploy from a branch`로 선택합니다.
5. Branch를 `main`, folder를 `/root`로 선택합니다.
6. 저장 후 몇 분 뒤 `https://<username>.github.io/<repo-name>/` 주소로 접속합니다.

## 데이터 저장 방식

이 앱은 별도 서버나 데이터베이스를 사용하지 않습니다.

- 기본 저장: 사용자의 브라우저 localStorage
- 파일 저장: 사용자가 `저장 폴더 선택`을 누르면 선택한 폴더에 날짜별 JSON 저장
- 백업/공유: `JSON 내보내기`와 `JSON 가져오기` 사용

따라서 GitHub Pages로 배포해도 개인 일정 데이터는 GitHub에 자동 업로드되지 않습니다.
