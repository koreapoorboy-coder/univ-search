[README_incoming.md](https://github.com/user-attachments/files/26655517/README_incoming.md)
# incoming 폴더 용도

이 폴더는 새로 받은 PDF/엑셀/배치 JSON을 임시로 넣는 공간입니다.

권장 흐름:
1. incoming에 배치 원본 저장
2. books/ 개별 파일로 분해
3. catalog/와 dedupe/ 갱신
4. bridges/ 갱신
5. 마지막에 runtime 파일(starter/mapping/lookup) 갱신
