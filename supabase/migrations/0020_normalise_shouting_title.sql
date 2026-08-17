-- Normalises the one imported title that was stored in full capitals.
--
-- EuroMediterranean Biomedical Journal typesets its article titles in caps, and
-- the scholar import copied that styling into the data. It is a presentation
-- choice of the journal, not part of the title: the same journal's other paper
-- in this archive (Pediatric Thyroid Surgery) was already stored in normal
-- case, so this row was the outlier.
--
-- It matters more now than it did: covers set the title at display size, and a
-- wall of capitals was the least readable card in the grid.
--
-- Guarded on the exact old value, so re-running after any later edit is a
-- no-op rather than an overwrite.

update public.researches
set title = 'Thyroid hemiagenesis with papillary carcinoma: a case report with literature review'
where title = 'THYROID HEMIAGENESIS WITH PAPILLARY CARCINOMA: A CASE REPORT WITH LITERATURE REVIEW';
